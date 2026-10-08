import { NextResponse } from "next/server";
import { leerConfig } from "@/lib/config";
import { NICHO_IDS } from "@/lib/taxonomia";
import { combosTienda, productosTienda } from "@/lib/tienda";
import { armarPedido } from "@/lib/armador";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let cuerpo: { nicho?: unknown; personas?: unknown; presupuesto?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const nicho = String(cuerpo.nicho ?? "");
  const personas = Math.floor(Number(cuerpo.personas));
  const presupuesto = Number(cuerpo.presupuesto);
  if (!NICHO_IDS.includes(nicho)) return NextResponse.json({ error: "Elegí un tipo de negocio" }, { status: 400 });
  if (!(personas >= 1 && personas <= 100000)) return NextResponse.json({ error: "Indicá la cantidad de personas o plazas" }, { status: 400 });
  if (!(presupuesto > 0 && presupuesto <= 1e9)) return NextResponse.json({ error: "Indicá un presupuesto" }, { status: 400 });

  const cfg = await leerConfig();
  const [pedidos, candidatos] = await Promise.all([
    combosTienda({ tipo: "PEDIDO_NICHO", nicho, activo: true }),
    productosTienda({ where: { nichos: { has: nicho } }, take: 40 }),
  ]);
  const disponibles = new Map(candidatos.map((p) => [p.codigo, p]));
  const base = (pedidos[0]?.items ?? []).map((i) => {
    disponibles.set(i.producto.codigo, i.producto);
    return { codigo: i.producto.codigo, precio: i.producto.precio, cantidad: i.cantidad };
  });
  // Solo productos que hoy se venden.
  const publicados = new Set((await productosTienda({ where: { codigo: { in: [...disponibles.keys()] } } })).map((p) => p.codigo));
  const items = armarPedido({
    base: base.filter((b) => publicados.has(b.codigo)),
    candidatos: candidatos.map((c) => ({ codigo: c.codigo, precio: c.precio })),
    personas,
    presupuesto,
    compraMinima: cfg.compraMinima,
  });
  const lineas = items.map((i) => ({ producto: disponibles.get(i.codigo)!, cantidad: i.cantidad }));
  return NextResponse.json({
    lineas,
    total: lineas.reduce((s, l) => s + l.producto.precio * l.cantidad, 0),
    compraMinima: cfg.compraMinima,
    presupuestoAjustado: presupuesto < cfg.compraMinima,
  });
}
