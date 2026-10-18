// Lista del mes para un hogar: personas, qué quiere resolver y presupuesto → productos reales
// con precio de hoy, armados sobre los combos del tema. Pura de leer: no guarda nada.

import { NextResponse } from "next/server";
import { leerConfig } from "@/lib/config";
import { combosTienda } from "@/lib/tienda";
import { armarPedido, factorHogar, OBJETIVOS_LISTA, type ObjetivoLista } from "@/lib/armador";
import type { ProductoTienda } from "@/lib/tienda";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let cuerpo: { personas?: unknown; objetivo?: unknown; presupuesto?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const personas = Math.floor(Number(cuerpo.personas));
  const objetivo = String(cuerpo.objetivo ?? "") as ObjetivoLista;
  const presupuesto = Number(cuerpo.presupuesto);
  if (!(objetivo in OBJETIVOS_LISTA)) return NextResponse.json({ error: "Elegí qué querés resolver" }, { status: 400 });
  if (!(personas >= 1 && personas <= 20)) return NextResponse.json({ error: "Elegí para cuántas personas" }, { status: 400 });
  if (!(presupuesto > 0 && presupuesto <= 1e8)) return NextResponse.json({ error: "Elegí un presupuesto" }, { status: 400 });

  const cfg = await leerConfig();
  const orden = OBJETIVOS_LISTA[objetivo].combos as readonly string[];
  const combos = (await combosTienda({ slug: { in: [...orden] }, activo: true })).sort((a, b) => orden.indexOf(a.slug) - orden.indexOf(b.slug));
  const productos = new Map<string, ProductoTienda>();
  for (const c of combos) for (const i of c.items) productos.set(i.producto.codigo, i.producto);
  const [primero, ...resto] = combos;
  const items = armarPedido({
    base: (primero?.items ?? []).map((i) => ({ codigo: i.producto.codigo, precio: i.producto.precio, cantidad: i.cantidad })),
    candidatos: resto.flatMap((c) => c.items.map((i) => ({ codigo: i.producto.codigo, precio: i.producto.precio }))),
    personas,
    presupuesto,
    compraMinima: cfg.compraMinima,
    factor: factorHogar(personas),
  });
  const lineas = items.map((i) => ({ producto: productos.get(i.codigo)!, cantidad: i.cantidad })).filter((l) => l.producto);
  return NextResponse.json({
    lineas,
    total: lineas.reduce((s, l) => s + l.producto.precio * l.cantidad, 0),
    compraMinima: cfg.compraMinima,
    presupuestoAjustado: presupuesto < cfg.compraMinima,
  });
}
