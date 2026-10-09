"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { requireAdmin } from "./auth";
import { calcularCombo, descuentoMaximo, margenPct } from "./precios";
import { leerItemsCombo, slugDesdeNombre } from "./combos";
import type { EstadoPedido } from "@prisma/client";
import { ESTADOS, confirmarPago } from "./pedidos";
import { ZONAS, normalizarCp, validarListaCp } from "./envios/geo";
import { generarTokenSync, registrarSync, resolverPendientes, textoResumen } from "./sync";
import { codigoMarcador } from "./marcador";
import { urlSitio } from "./sitio";
import { NICHO_IDS, OBJETIVO_IDS } from "./taxonomia";
import { aplicarFotos, importarCatalogo, leerCatalogoCsv } from "./catalogo";
import { leerJsonFotos } from "./fotos";
import { leerDiasCorte } from "./corte";

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

function emailONull(v: string | null): string | null {
  if (v === null) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) throw new Error("El email de contacto no es válido");
  return v.toLowerCase();
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
  revalidatePath("/", "layout");
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
    const fotos = [...new Set(String(fd.get("fotos") ?? "").split(/\s+/).filter(Boolean))].slice(0, 12).map((u) => urlFoto(u)!);
  const foto = fotos[0] ?? null;
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
          fotos,
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
  revalidatePath("/", "layout");
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
        recargoPrecioPct: numero(fd, "recargoPrecioPct", { min: 0, max: 50 }),
        recargoSugeridoPct: numero(fd, "recargoSugeridoPct", { min: 0, max: 300 }),
        corteDias: leerDiasCorte(String(fd.get("corteDias") ?? "")).join(","),
        corteHora: Math.round(numero(fd, "corteHora", { min: 0, max: 23 })),
        comisionPagoPct: numero(fd, "comisionPagoPct", { min: 0, max: 99 }),
        costoPackaging: numero(fd, "costoPackaging", { min: 0 }),
        envioGratisDesde:
          envio === null ? null : numero(fd, "envioGratisDesde", { min: 0 }),
        whatsapp: textoONull(fd, "whatsapp")?.slice(0, 40) ?? null,
        emailContacto: emailONull(textoONull(fd, "emailContacto")),
        transferenciaDatos: textoONull(fd, "transferenciaDatos")?.slice(0, 800) ?? null,
      },
    });
  } catch (e) {
    destino = `/admin/configuracion?error=${encodeURIComponent(mensaje(e))}`;
  }
  revalidatePath("/", "layout");
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
  revalidatePath("/", "layout");
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
  revalidatePath("/", "layout");
  redirect(destino);
}

// ---------- Combos ----------

function fecha(fd: FormData, campo: string, finDelDia = false): Date | null {
  const v = textoONull(fd, campo);
  if (v === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`"${campo}" debe ser una fecha`);
  // Horario de Argentina (UTC-3): la vigencia incluye el día completo.
  const d = new Date(`${v}T${finDelDia ? "23:59:59" : "00:00:00"}-03:00`);
  if (Number.isNaN(d.getTime())) throw new Error(`"${campo}" debe ser una fecha`);
  return d;
}

export type ValoresCombo = {
  nombre: string;
  slug: string;
  tipo: string;
  nicho: string;
  descuentoPct: string;
  vigenteDesde: string;
  vigenteHasta: string;
  items: string;
  activo: boolean;
  destacado: boolean;
};
export type EstadoCombo = { error: string; valores: ValoresCombo } | null;

/** Si algo falla devuelve el error junto con lo que se había cargado, para no perder el formulario. */
export async function guardarCombo(_previo: EstadoCombo, fd: FormData): Promise<EstadoCombo> {
  await requireAdmin();
  const idCrudo = String(fd.get("id") ?? "");
  const id = idCrudo ? Number.parseInt(idCrudo, 10) : null;
  let destino: string;
  try {
    const nombre = String(fd.get("nombre") ?? "").trim();
    if (nombre.length < 3) throw new Error("Poné un nombre de al menos 3 letras");
    const slug = slugDesdeNombre(textoONull(fd, "slug") ?? nombre);
    if (!slug) throw new Error("El nombre no genera una dirección válida");
    const tipo = String(fd.get("tipo"));
    if (tipo !== "COMBO" && tipo !== "PEDIDO_NICHO") throw new Error("Tipo inválido");
    const nicho = textoONull(fd, "nicho");
    if (nicho !== null && !NICHO_IDS.includes(nicho)) throw new Error("Nicho inválido");
    if (tipo === "PEDIDO_NICHO" && !nicho) throw new Error("Un pedido tipo necesita un nicho");
    const descuentoPct = numero(fd, "descuentoPct", { min: 0, max: 90 });
    const vigenteDesde = fecha(fd, "vigenteDesde");
    const vigenteHasta = fecha(fd, "vigenteHasta", true);
    if (vigenteDesde && vigenteHasta && vigenteHasta < vigenteDesde) throw new Error("La vigencia termina antes de empezar");

    const items = leerItemsCombo(String(fd.get("items") ?? ""));
    if (!items.length) throw new Error("Agregá al menos un producto");
    const productos = await prisma.product.findMany({ where: { codigo: { in: items.map((i) => i.codigo) } } });
    const porCodigo = new Map(productos.map((p) => [p.codigo, p]));
    const faltan = items.filter((i) => !porCodigo.has(i.codigo)).map((i) => i.codigo);
    if (faltan.length) throw new Error(`Códigos que no existen: ${faltan.join(", ")}`);

    // Regla dura: ningún combo ni promo puede quedar debajo del margen mínimo.
    const cfg = await prisma.setting.findUniqueOrThrow({ where: { id: 1 } });
    const margenMinimo = Number(cfg.margenMinimoPct);
    const lineas = items.map((i) => {
      const p = porCodigo.get(i.codigo)!;
      return { precio: Number(p.precioPublico), costo: Number(p.costo), cantidad: i.cantidad };
    });
    const calc = calcularCombo(lineas, descuentoPct, margenMinimo);
    if (calc.bloqueado) {
      throw new Error(
        `Bloqueado: con ${descuentoPct}% de descuento el margen queda en ${calc.margenPct.toFixed(1)}%, debajo del mínimo de ${margenMinimo}%. Descuento máximo posible: ${descuentoMaximo(lineas, margenMinimo)}%.`,
      );
    }

    const repetido = await prisma.combo.findUnique({ where: { slug } });
    if (repetido && repetido.id !== id) throw new Error(`Ya existe un combo con la dirección "${slug}"`);

    const datos = {
      nombre,
      slug,
      tipo: tipo as "COMBO" | "PEDIDO_NICHO",
      nicho,
      descuentoPct,
      activo: fd.get("activo") === "on",
      destacado: fd.get("destacado") === "on",
      vigenteDesde,
      vigenteHasta,
    };
    const guardado = await prisma.$transaction(async (tx) => {
      const c = id ? await tx.combo.update({ where: { id }, data: datos }) : await tx.combo.create({ data: datos });
      await tx.comboItem.deleteMany({ where: { comboId: c.id } });
      await tx.comboItem.createMany({ data: items.map((i) => ({ comboId: c.id, codigo: i.codigo, cantidad: i.cantidad })) });
      return c;
    });
    destino = `/admin/combos/${guardado.id}?ok=1`;
  } catch (e) {
    const t = (campo: string) => String(fd.get(campo) ?? "");
    return {
      error: mensaje(e),
      valores: {
        nombre: t("nombre"),
        slug: t("slug"),
        tipo: t("tipo"),
        nicho: t("nicho"),
        descuentoPct: t("descuentoPct"),
        vigenteDesde: t("vigenteDesde"),
        vigenteHasta: t("vigenteHasta"),
        items: t("items"),
        activo: fd.get("activo") === "on",
        destacado: fd.get("destacado") === "on",
      },
    };
  }
  revalidatePath("/", "layout");
  redirect(destino);
}

export async function eliminarCombo(fd: FormData) {
  await requireAdmin();
  const id = Number.parseInt(String(fd.get("id")), 10);
  if (fd.get("confirmar") !== "on") redirect(`/admin/combos/${id}?error=${encodeURIComponent("Marcá la casilla para confirmar la eliminación")}`);
  await prisma.combo.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/admin/combos?eliminado=1");
}

// ---------- Pedidos ----------

export async function cambiarEstadoPedido(fd: FormData) {
  await requireAdmin();
  const id = Number.parseInt(String(fd.get("id")), 10);
  const estado = String(fd.get("estado")) as EstadoPedido;
  let destino = `/admin/pedidos/${id}?ok=1`;
  try {
    if (!ESTADOS.some((e) => e.id === estado)) throw new Error("Estado inválido");
    const pedido = await prisma.order.findUniqueOrThrow({ where: { id } });
    const nota = textoONull(fd, "nota")?.slice(0, 300) ?? null;
    const tracking = textoONull(fd, "tracking")?.slice(0, 80) ?? null;
    if (estado === "PENDIENTE_PAGO" && pedido.estado !== "PENDIENTE_PAGO") throw new Error("Un pedido ya pagado no puede volver a pendiente");
    if (pedido.estado === "PENDIENTE_PAGO" && estado !== "PENDIENTE_PAGO" && estado !== "CANCELADO") {
      // Salir de "pendiente" siempre pasa por la confirmación de pago (suma vendidos y avisa al cliente).
      await confirmarPago(id, nota ?? (pedido.medioPago === "TRANSFERENCIA" ? "Transferencia verificada" : "Pago confirmado a mano"));
    }
    if (estado !== "PAGADO" || pedido.estado !== "PENDIENTE_PAGO") {
      const cambio = estado !== pedido.estado && !(pedido.estado === "PENDIENTE_PAGO" && estado === "PAGADO");
      await prisma.$transaction([
        prisma.order.update({ where: { id }, data: { estado, tracking: tracking ?? pedido.tracking } }),
        ...(cambio || nota ? [prisma.orderEvent.create({ data: { orderId: id, estado, nota } })] : []),
      ]);
    } else if (tracking) {
      await prisma.order.update({ where: { id }, data: { tracking } });
    }
  } catch (e) {
    destino = `/admin/pedidos/${id}?error=${encodeURIComponent(mensaje(e))}`;
  }
  revalidatePath("/", "layout");
  redirect(destino);
}

// ---------- Envíos, contacto y cobro ----------

export async function guardarEnvios(fd: FormData) {
  await requireAdmin();
  let destino = "/admin/envios?ok=1";
  try {
    const cpOrigen = normalizarCp(String(fd.get("cpOrigen") ?? ""));
    if (!cpOrigen) throw new Error("El código postal de origen debe tener 4 números");
    const tramosKg = String(fd.get("tramosKg") ?? "").split(/[,;\s]+/).filter(Boolean).map(Number);
    if (!tramosKg.length || tramosKg.some((t, i) => !(t > 0) || (i > 0 && t <= tramosKg[i - 1]))) throw new Error("Los tramos de peso deben ser números crecientes, ej. 1, 5, 10, 15, 20, 25");
    const zonas = Object.fromEntries(
      ZONAS.map((z) => {
        const fila = (tipo: string) => tramosKg.map((_, i) => numero(fd, `${z.id}.${tipo}.${i}`, { min: 0 }));
        return [z.id, { sucursal: fila("sucursal"), domicilio: fila("domicilio"), plazo: String(fd.get(`${z.id}.plazo`) ?? "").trim().slice(0, 60) }];
      }),
    );
    await prisma.setting.update({
      where: { id: 1 },
      data: {
        cpOrigen,
        entregaPropiaActiva: fd.get("entregaPropiaActiva") === "on",
        cpEntregaPropia: validarListaCp(String(fd.get("cpEntregaPropia") ?? "")),
        plazoEntregaPropia: String(fd.get("plazoEntregaPropia") ?? "").trim().slice(0, 60) || "24 a 48 hs hábiles",
        tablaEnvios: { tramosKg, zonas },
        tablaEnviosRevisada: fd.get("tablaEnviosRevisada") === "on",
      },
    });
  } catch (e) {
    destino = `/admin/envios?error=${encodeURIComponent(mensaje(e))}`;
  }
  revalidatePath("/", "layout");
  redirect(destino);
}

// ---------- Actualización de precios ----------

export type EstadoMarcador = { marcador: string } | { error: string } | null;

/** Genera un token nuevo y devuelve el marcador armado. El token no vuelve a mostrarse. */
export async function generarMarcador(_previo: EstadoMarcador, _fd: FormData): Promise<EstadoMarcador> {
  await requireAdmin();
  const sitio = urlSitio();
  if (!sitio.startsWith("https://")) {
    return { error: "El sitio tiene que estar publicado con https (definí NEXT_PUBLIC_SITE_URL): desde Distrimay, el navegador no deja enviar datos a una dirección sin https." };
  }
  return { marcador: codigoMarcador(sitio, await generarTokenSync()) };
}

export async function subirActualizacion(fd: FormData) {
  await requireAdmin();
  let destino: string;
  try {
    const archivo = fd.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) throw new Error("Elegí un archivo");
    if (archivo.size > 5 * 1024 * 1024) throw new Error("El archivo supera los 5 MB");
    const texto = await archivo.text();
    let r;
    if (/\.csv$/i.test(archivo.name) || !/^\s*[[{]/.test(texto)) {
      // CSV del proveedor con las mismas columnas del catálogo. No se asume que esté completo.
      const filas = leerCatalogoCsv(texto);
      r = await registrarSync({ origen: "csv", modo: "costos", completo: false, items: filas.map((f) => ({ ...f, categoria: f.categoria })) });
    } else {
      const j = JSON.parse(texto);
      r = await registrarSync({ origen: "json", modo: j.modo, completo: j.completo, items: j.items });
    }
    destino = `/admin/actualizaciones/${r.id}?resumen=${encodeURIComponent(textoResumen(r))}`;
  } catch (e) {
    destino = `/admin/actualizaciones?error=${encodeURIComponent(mensaje(e))}`;
  }
  revalidatePath("/", "layout");
  redirect(destino);
}

export async function resolverCambios(fd: FormData) {
  await requireAdmin();
  const syncId = Number.parseInt(String(fd.get("syncId")), 10);
  const accion = String(fd.get("accion"));
  const ids = fd.getAll("ids").map((v) => Number.parseInt(String(v), 10)).filter(Number.isInteger);
  let destino: string;
  try {
    if (!["aprobar", "rechazar", "aprobar-todos"].includes(accion)) throw new Error("Acción inválida");
    if (accion !== "aprobar-todos" && !ids.length) throw new Error("Marcá al menos un cambio");
    const n = await resolverPendientes(syncId, accion === "aprobar-todos" ? "todos" : ids, accion !== "rechazar");
    destino = `/admin/actualizaciones/${syncId}?resumen=${encodeURIComponent(`${n} cambios ${accion === "rechazar" ? "rechazados" : "aplicados"}.`)}`;
  } catch (e) {
    destino = `/admin/actualizaciones/${syncId}?error=${encodeURIComponent(mensaje(e))}`;
  }
  revalidatePath("/", "layout");
  redirect(destino);
}

export async function guardarUmbral(fd: FormData) {
  await requireAdmin();
  let destino = "/admin/actualizaciones?ok=1";
  try {
    await prisma.setting.update({ where: { id: 1 }, data: { umbralAutoPct: numero(fd, "umbralAutoPct", { min: 0, max: 100 }) } });
  } catch (e) {
    destino = `/admin/actualizaciones?error=${encodeURIComponent(mensaje(e))}`;
  }
  redirect(destino);
}

// ---------- Imágenes propias ----------

const HOST_BLOB = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//;

/** Suma imágenes recién subidas a sus productos. Las propias van primero: la primera pasa a ser la foto principal. */
export async function registrarFotos(items: { codigo: string; url: string }[]): Promise<{ asignadas: number; desconocidos: string[] }> {
  await requireAdmin();
  const validas = items.filter((i) => typeof i.codigo === "string" && typeof i.url === "string" && HOST_BLOB.test(i.url)).slice(0, 200);
  const porCodigo = new Map<string, string[]>();
  for (const i of validas) porCodigo.set(i.codigo, [...(porCodigo.get(i.codigo) ?? []), i.url]);
  const productos = await prisma.product.findMany({ where: { codigo: { in: [...porCodigo.keys()] } }, select: { codigo: true, fotos: true, fotoUrl: true } });
  let asignadas = 0;
  for (const p of productos) {
    const nuevas = (porCodigo.get(p.codigo) ?? []).sort();
    const previas = p.fotos.length ? p.fotos : p.fotoUrl ? [p.fotoUrl] : [];
    const propias = previas.filter((f) => HOST_BLOB.test(f));
    const deProveedor = previas.filter((f) => !HOST_BLOB.test(f));
    const fotos = [...new Set([...propias, ...nuevas, ...deProveedor])];
    await prisma.product.update({ where: { codigo: p.codigo }, data: { fotos, fotoUrl: fotos[0] } });
    asignadas += nuevas.length;
  }
  const conocidos = new Set(productos.map((p) => p.codigo));
  revalidatePath("/", "layout");
  return { asignadas, desconocidos: [...porCodigo.keys()].filter((c) => !conocidos.has(c)) };
}
