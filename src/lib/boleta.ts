// Boleta de La Granja del Centro leída de una foto (la manda Santiago a su asistente por WhatsApp):
// queda registrada la compra (para Ana, finanzas) y, si lo que pagó por un producto es distinto de nuestro
// costo, se actualiza el costo por el mismo circuito que la lista de precios (los cambios grandes esperan su OK).
import { POR_CODIGO_PROVEEDOR, PRODUCTOS_PROVEEDORES } from "./catalogo-proveedores";
import { costoDePresentacion } from "./listas-presentacion";
import { pesos } from "./precios";

export type RenglonBoleta = { codigo?: string; descripcion: string; cantidad?: number; precio_unitario: number };

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ");
const RUIDO = new Set(["x", "kg", "gr", "grs", "g", "de", "con", "sin", "el", "la", "los", "las", "y", "1", "500", "250", "suelto", "fraccionado", "fraccionada"]);
const palabras = (t: string) => norm(t).split(/\s+/).filter((w) => w.length > 1 && !RUIDO.has(w));

/** Nuestros códigos para un renglón: por el código del proveedor o, si no figura, por el nombre. */
export function mapearRenglon(r: RenglonBoleta): string[] {
  const cod = (r.codigo ?? "").match(/\d{3}-\d{3}/)?.[0];
  if (cod && POR_CODIGO_PROVEEDOR.LG[cod]) return POR_CODIGO_PROVEEDOR.LG[cod];
  const ws = palabras(r.descripcion);
  if (ws.length < 1) return [];
  let mejor: { codigos: string[]; puntaje: number } = { codigos: [], puntaje: 0 };
  for (const p of PRODUCTOS_PROVEEDORES) {
    if (!p.codigoProveedor || p.codigoProveedor === "propio") continue;
    const pw = palabras(p.producto);
    const comunes = ws.filter((w) => pw.some((x) => x.startsWith(w) || w.startsWith(x))).length;
    const puntaje = comunes / Math.max(ws.length, pw.length);
    if (puntaje > mejor.puntaje) mejor = { codigos: POR_CODIGO_PROVEEDOR.LG[p.codigoProveedor] ?? [p.codigo], puntaje };
  }
  return mejor.puntaje >= 0.6 ? mejor.codigos : [];
}

export async function cargarBoleta(b: { fecha?: string; total?: number; items: RenglonBoleta[] }): Promise<string> {
  const { prisma } = await import("./prisma");
  const items = (b.items ?? []).filter((r) => r && r.descripcion && Number(r.precio_unitario) > 0);
  if (!items.length) return "No pude leer renglones con precio en la boleta.";
  const total = Number(b.total) || items.reduce((s, r) => s + Number(r.precio_unitario) * (Number(r.cantidad) || 1), 0);
  // La compra queda registrada (Ana la usa para el flujo de caja).
  await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES ('compra-lg', true, ${JSON.stringify({ fecha: b.fecha ?? null, total, items })})`;

  const codigos = [...new Set(items.flatMap(mapearRenglon))];
  const nuestros = await prisma.product.findMany({ where: { codigo: { in: codigos } }, select: { codigo: true, producto: true, costo: true, precioPublico: true, contenido: true } });
  const cambios: { codigo: string; producto: string; costo: number; precioPublico: number; antes: number }[] = [];
  const sinMapear: string[] = [];
  for (const r of items) {
    const cods = mapearRenglon(r);
    if (!cods.length) {
      sinMapear.push(r.descripcion);
      continue;
    }
    for (const c of cods) {
      const p = nuestros.find((x) => x.codigo === c);
      if (!p) continue;
      const antes = Number(p.costo);
      const costo = costoDePresentacion(Number(r.precio_unitario), antes, p.contenido === null ? null : Number(p.contenido));
      if (antes > 0 && Math.abs(costo - antes) / antes < 0.01) continue;
      const precioPublico = antes > 0 ? Math.round((Number(p.precioPublico) * costo) / antes / 10) * 10 : Number(p.precioPublico);
      cambios.push({ codigo: c, producto: p.producto, costo, precioPublico, antes });
    }
  }
  let detalle = "";
  if (cambios.length) {
    const { registrarSync } = await import("./sync");
    const r = await registrarSync({ origen: "boleta-lg", modo: "costos", completo: false, items: cambios.map(({ codigo, producto, costo, precioPublico }) => ({ codigo, producto, costo, precioPublico })), prefijo: "LG-" });
    const filas = await prisma.priceSyncItem.findMany({ where: { syncId: r.id, tipo: "CAMBIO" } });
    detalle = filas.map((f) => `• ${f.producto}: costo ${pesos(Number(f.costoAntes))} → ${pesos(Number(f.costoNuevo))}${f.estado === "PENDIENTE" ? " (espera tu OK en Actualizaciones)" : ""}`).join("\n");
  }
  return [
    `Compra registrada: ${items.length} renglones, total ${pesos(Math.round(total))}${b.fecha ? ` (${b.fecha})` : ""}.`,
    cambios.length ? `Costos que cambiaron:\n${detalle}` : "Los costos coinciden con los que teníamos.",
    sinMapear.length ? `No los tengo como productos nuestros: ${sinMapear.slice(0, 8).join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
