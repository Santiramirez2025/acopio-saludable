// Lista de precios en CSV, pública y siempre al día. La usa la planilla de Google Drive con
// =IMPORTDATA(...), que se actualiza sola: se le comparte a un comercio y no hay que reenviar nada.

import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { esSinTacc, wherePublicado } from "@/lib/filtros-producto";
import { precioSugerido, precioTransferencia, precioVenta } from "@/lib/precios";

export const revalidate = 1800; // media hora: los precios cambian a lo sumo un par de veces por día

const ORDEN = ["Frutos secos y mix", "Frutas desecadas", "Semillas y granos", "Cereales y granolas", "Harinas y Féculas", "Legumbres", "Especias", "Café, yerba e infusiones", "Suplementos", "Almacen", "Supermercado", "Panificados", "Repostería", "Chocolates"];
const sinRotulo = (t: string) => t.replace(/sin\s*gluten|sin\s*t\.?a\.?c\.?c\.?|s\/\s*tacc|libre de gluten/gi, "").replace(/\s+/g, " ").trim();
const celda = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const cfg = await leerConfig();
  const productos = await prisma.product.findMany({
    where: wherePublicado(cfg.margenMinimoPct),
    select: { codigo: true, producto: true, presentacion: true, categoria: true, precioPublico: true },
  });
  const orden = (c: string) => ORDEN.indexOf(c) + 1 || 99;
  productos.sort((a, b) => orden(a.categoria) - orden(b.categoria) || a.categoria.localeCompare(b.categoria) || a.producto.localeCompare(b.producto));
  const filas = [["Categoría", "Producto", "Presentación", "Precio", `Por transferencia (-${cfg.descuentoTransferenciaPct}%)`, `Venta sugerida (+${cfg.recargoSugeridoPct}%)`, "Ganás por unidad", "Sin TACC"]];
  for (const p of productos) {
    const precio = Math.round(precioVenta(Number(p.precioPublico), cfg.recargoPrecioPct));
    const s = precioSugerido(precio, cfg.recargoSugeridoPct);
    filas.push([
      p.categoria === "Almacen" ? "Almacén" : p.categoria === "Sin categoría" ? "Otros" : p.categoria,
      sinRotulo(p.producto),
      sinRotulo(p.presentacion),
      String(precio),
      String(Math.round(precioTransferencia(precio, cfg.descuentoTransferenciaPct) ?? precio)),
      s ? String(s.sugerido) : "",
      s ? String(Math.round(s.ganancia)) : "",
      esSinTacc(p) ? "Sí" : "",
    ]);
  }
  return new Response("﻿" + filas.map((f) => f.map(celda).join(",")).join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "public, max-age=900" },
  });
}
