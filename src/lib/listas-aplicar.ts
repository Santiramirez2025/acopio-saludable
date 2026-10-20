// Aplica una lista de precios de Todo Granolas o La Granja: actualiza el costo de nuestros productos
// mapeados y mueve el precio de venta en la misma proporción (conserva el margen de cada producto).
// Pasa por el mismo circuito que Distrimay: los cambios chicos se aplican solos, los grandes esperan
// aprobación en Actualizaciones, y todo queda en el historial.

import { prisma } from "./prisma";
import { registrarSync } from "./sync";
import { avisarSantiago } from "./avisos";
import { POR_CODIGO_PROVEEDOR } from "./catalogo-proveedores";
import { detectarProveedor, fechaDeLista, parsearLista, type Proveedor } from "./listas-pdf";
import { filasDePdf } from "./listas-pdf-leer";
import { pesos } from "./precios";

export type ResultadoLista = { proveedor: Proveedor; fecha: string | null; leidos: number; mapeados: number; cambios: { codigo: string; producto: string; costoAntes: number; costoNuevo: number; precioAntes: number; precioNuevo: number; pct: number; estado: string }[]; faltantes: string[] };

export async function aplicarListaPdf(bytes: Uint8Array, nombreArchivo = "", origen = "lista-pdf"): Promise<ResultadoLista | { error: string }> {
  const { filas, texto } = await filasDePdf(bytes);
  const proveedor = detectarProveedor(texto);
  if (!proveedor) return { error: "No parece una lista de Todo Granolas ni de La Granja del Centro." };
  const lista = parsearLista(filas);
  if (!lista.length) return { error: "No encontré renglones con código y precio en el PDF." };
  const mapa = POR_CODIGO_PROVEEDOR[proveedor];
  const prefijo = proveedor === "LG" ? "LG-" : "TG-";
  const nuestros = await prisma.product.findMany({ where: { codigo: { startsWith: prefijo } }, select: { codigo: true, producto: true, presentacion: true, costo: true, precioPublico: true } });
  const porCodigo = new Map(nuestros.map((p) => [p.codigo, p]));
  const items: { codigo: string; producto: string; costo: number; precioPublico: number }[] = [];
  const faltantes: string[] = [];
  for (const [codProv, codigo] of Object.entries(mapa)) {
    const r = lista.find((x) => x.codigo === codProv);
    const p = porCodigo.get(codigo);
    if (!p) continue;
    if (!r) { faltantes.push(`${p.producto} (${codProv})`); continue; }
    const costoAntes = Number(p.costo);
    const costo = Math.round(r.precio);
    // Mismo margen que tenía: el precio sube o baja en la misma proporción que el costo, redondeado a $10.
    const precioPublico = costoAntes > 0 ? Math.round((Number(p.precioPublico) * costo) / costoAntes / 10) * 10 : Number(p.precioPublico);
    items.push({ codigo, producto: p.producto, costo, precioPublico });
  }
  if (!items.length) return { error: "La lista no trae ninguno de nuestros productos." };
  const r = await registrarSync({ origen: `${origen}-${proveedor.toLowerCase()}`, modo: "costos", completo: false, items, prefijo });
  const detalle = await prisma.priceSyncItem.findMany({ where: { syncId: r.id, tipo: "CAMBIO" }, orderBy: { codigo: "asc" } });
  return {
    proveedor,
    fecha: fechaDeLista(texto, nombreArchivo),
    leidos: lista.length,
    mapeados: items.length,
    cambios: detalle.map((d) => ({ codigo: d.codigo, producto: d.producto, costoAntes: Number(d.costoAntes), costoNuevo: Number(d.costoNuevo), precioAntes: Number(d.precioAntes), precioNuevo: Number(d.precioNuevo), pct: Number(d.pct), estado: d.estado })),
    faltantes,
  };
}

const NOMBRE: Record<Proveedor, string> = { TG: "Todo Granolas", LG: "La Granja del Centro" };

/** Resumen corto para WhatsApp. */
export function resumenLista(r: ResultadoLista): string {
  const subas = r.cambios.filter((c) => c.pct > 0).length;
  const bajas = r.cambios.filter((c) => c.pct < 0).length;
  const pendientes = r.cambios.filter((c) => c.estado === "PENDIENTE");
  const lineas = [`📋 Lista ${NOMBRE[r.proveedor]}${r.fecha ? ` (${r.fecha})` : ""}: ${r.mapeados} productos nuestros, ${subas} subieron y ${bajas} bajaron.`];
  for (const c of r.cambios.slice(0, 12)) lineas.push(`${c.pct > 0 ? "▲" : "▼"} ${c.producto}: costo ${pesos(c.costoAntes)} → ${pesos(c.costoNuevo)} (${c.pct > 0 ? "+" : ""}${c.pct.toFixed(1)}%), precio ${pesos(c.precioAntes)} → ${pesos(c.precioNuevo)}${c.estado === "PENDIENTE" ? " · espera tu OK" : ""}`);
  if (r.cambios.length > 12) lineas.push(`… y ${r.cambios.length - 12} más.`);
  if (pendientes.length) lineas.push(`${pendientes.length} cambios grandes esperan tu aprobación en el panel → Actualizaciones.`);
  if (r.faltantes.length) lineas.push(`No figuran en la lista: ${r.faltantes.join(", ")}.`);
  return lineas.join("\n");
}

/** Descarga la lista del día de La Granja desde su web y la aplica. */
export async function actualizarDesdeLaGranja(): Promise<ResultadoLista | { error: string }> {
  const home = await fetch("https://lagranjadelcentro.com.ar/", { signal: AbortSignal.timeout(20_000) }).then((r) => r.text()).catch(() => "");
  const m = home.match(/href="([^"]*lista-precios-web\/[^"]+\.pdf)"/i);
  if (!m) return { error: "No encontré el link de la lista en lagranjadelcentro.com.ar" };
  const url = new URL(m[1].replace(/&amp;/g, "&"), "https://lagranjadelcentro.com.ar/").toString();
  const nombre = decodeURIComponent(url.split("/").pop() ?? "");
  // La misma lista no se aplica dos veces: el nombre del archivo lleva la fecha.
  const ultima = await prisma.priceSync.findFirst({ where: { origen: "web-lg", nota: { contains: nombre } }, orderBy: { createdAt: "desc" } });
  if (ultima) return { error: `La lista ${nombre} ya se aplicó.` };
  const buf = await fetch(url, { signal: AbortSignal.timeout(60_000) }).then((r) => r.arrayBuffer());
  const r = await aplicarListaPdf(new Uint8Array(buf), nombre, "web");
  if (!("error" in r)) {
    const s = await prisma.priceSync.findFirst({ where: { origen: "web-lg" }, orderBy: { createdAt: "desc" } });
    if (s) await prisma.priceSync.update({ where: { id: s.id }, data: { nota: `${s.nota ? `${s.nota} ` : ""}archivo: ${nombre}` } });
  }
  return r;
}

export async function avisarResultadoLista(r: ResultadoLista | { error: string }): Promise<void> {
  if ("error" in r) return;
  if (!r.cambios.length) return; // sin cambios no se molesta
  await avisarSantiago("Lista de precios actualizada", resumenLista(r));
}
