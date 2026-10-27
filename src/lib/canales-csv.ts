// Precios por canal (web, Mercado Libre Clásica y Premium, PedidosYa y Rappi) para combos y productos
// publicados, en CSV. Es la base para cargar las publicaciones: nunca se vende por debajo de lo que queda
// en la web, porque el precio de cada canal ya suma comisión, cargos, IVA de la comisión, IIBB y envío.
// Lo usan el panel (/admin/canales.csv) y los agentes (Diego y Cami, por /api/admin/canales).
import { combosTienda, productosTienda } from "./tienda";
import { precioCanal } from "./canales";

const celda = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function csvCanales(): Promise<string> {
  const [combos, productos] = await Promise.all([combosTienda({ activo: true, tipo: "COMBO" }), productosTienda({ take: 400 })]);
  const filas: (string | number)[][] = [["Tipo", "Código/slug", "Nombre", "Precio web", "Mercado Libre Clásica", "Mercado Libre Premium", "PedidosYa", "Rappi"]];
  for (const c of combos.filter((x) => x.disponible)) {
    const w = Math.round(c.precio);
    filas.push(["Combo", c.slug, c.nombre, w, precioCanal(w, "mercadolibre"), precioCanal(w, "mercadolibre-premium"), precioCanal(w, "pedidosya"), precioCanal(w, "rappi")]);
  }
  for (const p of productos) {
    const w = Math.round(p.precio);
    filas.push(["Producto", p.codigo, `${p.producto} ${p.presentacion}`.trim(), w, precioCanal(w, "mercadolibre"), precioCanal(w, "mercadolibre-premium"), precioCanal(w, "pedidosya"), precioCanal(w, "rappi")]);
  }
  return "﻿" + filas.map((f) => f.map(celda).join(",")).join("\n");
}

export function respuestaCsvCanales(csv: string): Response {
  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=precios-por-canal.csv" },
  });
}
