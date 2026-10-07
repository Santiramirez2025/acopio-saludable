"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { requireAdmin } from "./auth";
import { margenPct } from "./precios";
import { NICHO_IDS, OBJETIVO_IDS } from "./taxonomia";
import { aplicarFotos, importarCatalogo, leerCatalogoCsv } from "./catalogo";
import { leerJsonFotos } from "./fotos";

function numero(
  fd: FormData,
  campo: string,
  opciones: { min?: number; max?: number } = {},
): number {
  const crudo = String(fd.get(campo) ?? "")
    .trim()
    .replace(",", ".");
  const n = Number(crudo);
  if (crudo === "" || !Number.isFinite(n))
    throw new Error(`"${campo}" debe ser un número`);
  if (opciones.min !== undefined && n < opciones.min)
    throw new Error(`"${campo}" no puede ser menor a ${opciones.min}`);
  if (opciones.max !== undefined && n > opciones.max)
    throw new Error(`"${campo}" no puede ser mayor a ${opciones.max}`);
  return n;
}

function mensaje(e: unknown): string {
  return e instanceof Error ? e.message : "No se pudo guardar";
}

function textoONull(fd: FormData, campo: string): string | null {
  const v = String(fd.get(campo) ?? "").trim();
  return v === "" ? null : v;
}

function urlFoto(valor: string | null): string | null {
  if (!valor) return null;
  let u: URL;
  try {
    u = new URL(valor);
  } catch {
    throw new Error("La foto debe ser una URL completa (https://…)");
  }
  if (u.protocol !== "https:")
    throw new Error("La foto debe ser una URL https");
  return u.toString();
}

export async function alternarProducto(fd: FormData) {
  await requireAdmin();
  const codigo = String(fd.get("codigo"));
  const campo = String(fd.get("campo"));
  if (campo !== "visible" && campo !== "gancho")
    throw new Error("Campo no permitido");
  const p = await prisma.product.findUniqueOrThrow({ where: { codigo } });
  await prisma.product.update({
    where: { codigo },
    data:
      campo === "visible"
        ? {
            visible: !p.visible,
            ocultoMotivo: p.visible ? "Oculto a mano" : null,
          }
        : { gancho: !p.gancho },
  });
  revalidatePath("/admin", "layout");
}

export async function guardarProducto(fd: FormData) {
  await requireAdmin();
  const codigo = String(fd.get("codigo")); // texto, sin convertir
  const previo = await prisma.product.findUniqueOrThrow({ where: { codigo } });
  const ruta = `/admin/productos/${encodeURIComponent(codigo)}`;
  let destino = `${ruta}?ok=1`;
  try {
    const costo = numero(fd, "costo", { min: 0 });
    const precioPublico = numero(fd, "precioPublico", { min: 0 });
    const pesoCrudo = textoONull(fd, "pesoBrutoG");
    const pesoBrutoG =
      pesoCrudo === null
        ? null
        : Math.round(numero(fd, "pesoBrutoG", { min: 1, max: 100000 }));
    const estado = String(fd.get("estado"));
    if (estado !== "ACTIVO" && estado !== "BORRADOR" && estado !== "SIN_STOCK")
      throw new Error("Estado inválido");
    const visible = fd.get("visible") === "on";
    const foto = urlFoto(textoONull(fd, "fotoUrl"));
    const cambioPrecio =
      Number(previo.costo) !== costo ||
      Number(previo.precioPublico) !== precioPublico;

    await prisma.$transaction([
      prisma.product.update({
        where: { codigo },
        data: {
          costo,
          precioPublico,
          margenPct: margenPct(precioPublico, costo),
          pesoBrutoG,
          pesoEstimado:
            pesoBrutoG === previo.pesoBrutoG ? previo.pesoEstimado : false,
          fotoUrl: foto,
          fotos: foto === previo.fotoUrl ? previo.fotos : foto ? [foto] : [],
          nichos: fd
            .getAll("nichos")
            .map(String)
            .filter((n) => NICHO_IDS.includes(n)),
          objetivos: fd
            .getAll("objetivos")
            .map(String)
            .filter((o) => OBJETIVO_IDS.includes(o)),
          clasificacionRevisada: fd.get("clasificacionRevisada") === "on",
          estado,
          visible,
          ocultoMotivo: visible
            ? null
            : (previo.ocultoMotivo ?? "Oculto a mano"),
          gancho: fd.get("gancho") === "on",
          porQueLoElegimos: textoONull(fd, "porQueLoElegimos"),
        },
      }),
      ...(cambioPrecio
        ? [
            prisma.priceHistory.create({
              data: { codigo, costo, precioPublico, origen: "manual" },
            }),
          ]
        : []),
    ]);
  } catch (e) {
    destino = `${ruta}?error=${encodeURIComponent(mensaje(e))}`;
  }
  revalidatePath("/admin", "layout");
  redirect(destino);
}

export async function guardarConfig(fd: FormData) {
  await requireAdmin();
  let destino = "/admin/configuracion?ok=1";
  try {
    const envio = textoONull(fd, "envioGratisDesde");
    await prisma.setting.update({
      where: { id: 1 },
      data: {
        compraMinima: numero(fd, "compraMinima", { min: 0 }),
        margenMinimoPct: numero(fd, "margenMinimoPct", { min: 0, max: 99 }),
        descuentoTransferenciaPct: numero(fd, "descuentoTransferenciaPct", {
          min: 0,
          max: 99,
        }),
        comisionPagoPct: numero(fd, "comisionPagoPct", { min: 0, max: 99 }),
        costoPackaging: numero(fd, "costoPackaging", { min: 0 }),
        envioGratisDesde:
          envio === null ? null : numero(fd, "envioGratisDesde", { min: 0 }),
      },
    });
  } catch (e) {
    destino = `/admin/configuracion?error=${encodeURIComponent(mensaje(e))}`;
  }
  revalidatePath("/admin", "layout");
  redirect(destino);
}

async function leerArchivo(fd: FormData): Promise<string> {
  const archivo = fd.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0)
    throw new Error("Elegí un archivo");
  if (archivo.size > 4 * 1024 * 1024)
    throw new Error("El archivo supera los 4 MB");
  return archivo.text();
}

export async function importarCsv(fd: FormData) {
  await requireAdmin();
  let destino: string;
  try {
    const filas = leerCatalogoCsv(await leerArchivo(fd));
    const r = await importarCatalogo(prisma, filas, {
      origen: "csv",
      estadoNuevos: "BORRADOR",
    });
    destino = `/admin/importar?csv=${encodeURIComponent(
      `${r.total} filas: ${r.nuevos} nuevos (en borrador), ${r.cambiosDePrecio} con cambio de precio, ${r.datosActualizados} con datos actualizados, ${r.sinCambios} sin cambios.`,
    )}`;
  } catch (e) {
    destino = `/admin/importar?error=${encodeURIComponent(mensaje(e))}`;
  }
  revalidatePath("/admin", "layout");
  redirect(destino);
}

export async function importarFotos(fd: FormData) {
  await requireAdmin();
  let destino: string;
  try {
    const r = await aplicarFotos(prisma, leerJsonFotos(await leerArchivo(fd)), {
      pisar: fd.get("pisar") === "on",
    });
    destino = `/admin/importar?fotos=${encodeURIComponent(
      `${r.aplicadas} fotos cargadas, ${r.respetadas} ya tenían foto, ${r.sinFotoEnOrigen} sin foto en el proveedor, ${r.codigoDesconocido} códigos desconocidos.`,
    )}`;
  } catch (e) {
    destino = `/admin/importar?error=${encodeURIComponent(mensaje(e))}`;
  }
  revalidatePath("/admin", "layout");
  redirect(destino);
}
