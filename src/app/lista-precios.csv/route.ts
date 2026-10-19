// Lista de precios en CSV, pública y siempre al día. La usa la planilla de Google Drive con
// =IMPORTDATA(...), que se actualiza sola: se le comparte a un comercio y no hay que reenviar nada.

import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { esSinTacc, wherePublicado } from "@/lib/filtros-producto";
import { precioSugerido, precioVenta } from "@/lib/precios";

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
    select: { codigo: true, producto: true, presentacion: true, categoria: true, precioPublico: true, costo: true },
  });
  const orden = (c: string) => ORDEN.indexOf(c) + 1 || 99;
  productos.sort((a, b) => orden(a.categoria) - orden(b.categoria) || a.categoria.localeCompare(b.categoria) || a.producto.localeCompare(b.producto));
  // Descuento por cantidad para comercios: por unidades del mismo producto en el pedido.
  // Nunca baja del margen mínimo de mayorista (el mayor entre la configuración y 15%): ganamos siempre.
  const piso = Math.max(cfg.margenMinimoPct, 15) / 100;
  const escalas = [
    { desde: 3, pct: 8 },
    { desde: 6, pct: 12 },
  ];
  const conPiso = (precio: number, costo: number, pct: number) => {
    const minimo = costo > 0 ? Math.ceil(costo / (1 - piso) / 10) * 10 : 0;
    return Math.max(Math.round((precio * (1 - pct / 100)) / 10) * 10, Math.min(minimo, precio));
  };
  const filas = [["Categoría", "Producto", "Precio por unidad", ...escalas.map((e) => `Desde ${e.desde} unidades (-${e.pct}%)`), "Precio de venta sugerido", `Tu ganancia por unidad (desde ${escalas.at(-1)!.desde})`]];
  for (const p of productos) {
    const precio = Math.round(precioVenta(Number(p.precioPublico), cfg.recargoPrecioPct));
    const costo = Number(p.costo);
    const porEscala = escalas.map((e) => conPiso(precio, costo, e.pct));
    const s = precioSugerido(precio, cfg.recargoSugeridoPct);
    filas.push([
      p.categoria === "Almacen" ? "Almacén" : p.categoria === "Sin categoría" ? "Otros" : p.categoria,
      `${sinRotulo(p.producto)} ${sinRotulo(p.presentacion).replace(/fraccionad[ao]/i, "").trim()}${esSinTacc(p) ? " · Sin TACC" : ""}`.replace(/\s+/g, " ").trim(),
      String(precio),
      ...porEscala.map(String),
      s ? String(s.sugerido) : "",
      s ? String(Math.round(s.sugerido - porEscala.at(-1)!)) : "",
    ]);
  }
  return new Response("﻿" + filas.map((f) => f.map(celda).join(",")).join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "public, max-age=900" },
  });
}
