import type { PrismaClient, EstadoProducto } from "@prisma/client";
import { parseCsv } from "./csv";
import { margenPct } from "./precios";
import { clasificarNichos, clasificarObjetivos, detectarUnidad, estimarPesoBruto, motivoOculto } from "./clasificar";
import { urlsDesdeCampoPhotos, type FilaFoto } from "./fotos";

export type FilaCatalogo = {
  codigo: string;
  producto: string;
  marca: string;
  presentacion: string;
  categoria: string;
  formato: string;
  costo: number;
  precioPublico: number;
  contenido: number | null;
};

const COLUMNAS = ["codigo", "producto", "marca", "presentacion", "categoria", "formato", "costo", "precio_publico"];

function aNumero(valor: string, campo: string, linea: number): number {
  const n = Number(valor);
  if (valor === "" || !Number.isFinite(n) || n < 0) throw new Error(`Línea ${linea}: "${campo}" inválido (${valor || "vacío"})`);
  return n;
}

export function leerCatalogoCsv(texto: string): FilaCatalogo[] {
  const filas = parseCsv(texto);
  if (!filas.length) throw new Error("El CSV está vacío");
  const faltan = COLUMNAS.filter((c) => !(c in filas[0]));
  if (faltan.length) throw new Error(`Faltan columnas en el CSV: ${faltan.join(", ")}`);
  const vistos = new Set<string>();
  return filas.map((f, i) => {
    const linea = i + 2;
    const codigo = f.codigo; // texto tal cual: conserva ceros a la izquierda
    if (!codigo) throw new Error(`Línea ${linea}: falta el código`);
    if (vistos.has(codigo)) throw new Error(`Línea ${linea}: código repetido (${codigo})`);
    vistos.add(codigo);
    const contenido = f.contenido_g_o_ml ? Math.round(aNumero(f.contenido_g_o_ml, "contenido_g_o_ml", linea)) : null;
    return {
      codigo,
      producto: f.producto,
      marca: f.marca,
      presentacion: f.presentacion,
      categoria: f.categoria || "Sin categoría",
      formato: f.formato,
      costo: aNumero(f.costo, "costo", linea),
      precioPublico: aNumero(f.precio_publico, "precio_publico", linea),
      contenido: contenido || null,
    };
  });
}

export type ResumenImportacion = {
  total: number;
  nuevos: number;
  cambiosDePrecio: number;
  datosActualizados: number;
  sinCambios: number;
};

/**
 * Alta y actualización de productos desde el CSV.
 * - Producto nuevo: se clasifica en borrador (nicho, objetivo, peso, reglas de ocultamiento).
 * - Producto existente: solo se pisan los datos del proveedor. Lo que se edita en el panel
 *   (nichos, objetivos, foto, peso, visible, gancho) no se toca.
 * - Cada cambio de costo o precio queda en el historial.
 */
export async function importarCatalogo(
  db: PrismaClient,
  filas: FilaCatalogo[],
  opciones: { origen: string; estadoNuevos: EstadoProducto },
): Promise<ResumenImportacion> {
  const existentes = new Map((await db.product.findMany()).map((p) => [p.codigo, p]));
  const resumen: ResumenImportacion = { total: filas.length, nuevos: 0, cambiosDePrecio: 0, datosActualizados: 0, sinCambios: 0 };
  const altas = [];
  const historial: { codigo: string; costo: number; precioPublico: number; origen: string }[] = [];

  for (const f of filas) {
    const previo = existentes.get(f.codigo);
    const margen = margenPct(f.precioPublico, f.costo);
    if (!previo) {
      const unidad = detectarUnidad(f.presentacion, f.contenido);
      const motivo = motivoOculto(f);
      altas.push({
        ...f,
        margenPct: margen,
        unidad,
        pesoBrutoG: estimarPesoBruto(f, unidad),
        nichos: clasificarNichos(f),
        objetivos: clasificarObjetivos(f),
        estado: opciones.estadoNuevos,
        visible: motivo === null,
        ocultoMotivo: motivo,
      });
      historial.push({ codigo: f.codigo, costo: f.costo, precioPublico: f.precioPublico, origen: opciones.origen });
      resumen.nuevos++;
      continue;
    }
    const cambioPrecio = Number(previo.costo) !== f.costo || Number(previo.precioPublico) !== f.precioPublico;
    const cambioDatos =
      previo.producto !== f.producto ||
      previo.marca !== f.marca ||
      previo.presentacion !== f.presentacion ||
      previo.categoria !== f.categoria ||
      previo.formato !== f.formato ||
      previo.contenido !== f.contenido;
    if (!cambioPrecio && !cambioDatos) {
      resumen.sinCambios++;
      continue;
    }
    await db.product.update({
      where: { codigo: f.codigo },
      data: { ...f, margenPct: margen, unidad: detectarUnidad(f.presentacion, f.contenido) },
    });
    if (cambioPrecio) {
      historial.push({ codigo: f.codigo, costo: f.costo, precioPublico: f.precioPublico, origen: opciones.origen });
      resumen.cambiosDePrecio++;
    } else resumen.datosActualizados++;
  }

  if (altas.length) await db.product.createMany({ data: altas });
  if (historial.length) await db.priceHistory.createMany({ data: historial });
  return resumen;
}

export type ResumenFotos = { recibidas: number; aplicadas: number; sinFotoEnOrigen: number; codigoDesconocido: number; respetadas: number };

/** Carga fotos por código. No pisa una foto que ya esté cargada salvo que se pida con `pisar`. */
export async function aplicarFotos(db: PrismaClient, filas: FilaFoto[], opciones: { pisar: boolean }): Promise<ResumenFotos> {
  const actuales = new Map((await db.product.findMany({ select: { codigo: true, fotoUrl: true } })).map((p) => [p.codigo, p.fotoUrl]));
  const r: ResumenFotos = { recibidas: filas.length, aplicadas: 0, sinFotoEnOrigen: 0, codigoDesconocido: 0, respetadas: 0 };
  const vistos = new Set<string>();
  for (const f of filas) {
    if (vistos.has(f.sku)) continue;
    vistos.add(f.sku);
    if (!actuales.has(f.sku)) {
      r.codigoDesconocido++;
      continue;
    }
    const urls = urlsDesdeCampoPhotos(f.photos);
    if (!urls.length) {
      r.sinFotoEnOrigen++;
      continue;
    }
    if (actuales.get(f.sku) && !opciones.pisar) {
      r.respetadas++;
      continue;
    }
    await db.product.update({ where: { codigo: f.sku }, data: { fotoUrl: urls[0], fotos: urls } });
    r.aplicadas++;
  }
  return r;
}

/**
 * Completa en masa las fotos faltantes con la de un producto "hermano": mismo nombre y marca,
 * otra presentación (por ejemplo el de 150 g toma la foto del de 500 g). Solo toca productos sin foto.
 */
export async function completarFotosPorFamilia(db: PrismaClient): Promise<{ completadas: number; siguenSinFoto: number }> {
  const todos = await db.product.findMany({ select: { codigo: true, producto: true, marca: true, fotoUrl: true, fotos: true } });
  const clave = (p: { producto: string; marca: string }) => `${p.marca}|${p.producto}`.toLowerCase().replace(/\s+/g, " ").trim();
  const conFoto = new Map<string, { fotoUrl: string; fotos: string[] }>();
  for (const p of todos) if (p.fotoUrl && !conFoto.has(clave(p))) conFoto.set(clave(p), { fotoUrl: p.fotoUrl, fotos: p.fotos });
  let completadas = 0;
  let siguenSinFoto = 0;
  for (const p of todos) {
    if (p.fotoUrl) continue;
    const hermano = conFoto.get(clave(p));
    if (!hermano) {
      siguenSinFoto++;
      continue;
    }
    await db.product.update({ where: { codigo: p.codigo }, data: { fotoUrl: hermano.fotoUrl, fotos: [hermano.fotoUrl] } });
    completadas++;
  }
  return { completadas, siguenSinFoto };
}
