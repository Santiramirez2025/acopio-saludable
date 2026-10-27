// Precios por canal (web, Mercado Libre Clásica y Premium, PedidosYa) para combos y productos publicados,
// solo para el administrador. Es la base para cargar las publicaciones: nunca se vende por debajo de lo que
// queda en la web, porque el precio de cada canal ya suma comisión, cargos, IVA de la comisión, IIBB y envío.

import { esAdmin } from "@/lib/admin-acceso";
import { combosTienda, productosTienda } from "@/lib/tienda";
import { precioCanal } from "@/lib/canales";

export const dynamic = "force-dynamic";

const celda = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  if (!(await esAdmin())) return new Response("No autorizado", { status: 401 });
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
  return new Response("﻿" + filas.map((f) => f.map(celda).join(",")).join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=precios-por-canal.csv" },
  });
}
