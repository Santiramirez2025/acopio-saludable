import { NextResponse } from "next/server";
import { leerConfig } from "@/lib/config";
import { combosTienda, productosTienda, type ProductoTienda } from "@/lib/tienda";
import { cotizarDesayunos, desayunosDe, INSUMO_IDS, INSUMOS, type Insumo } from "@/lib/cotizador-hotel";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let c: { plazas?: unknown; ocupacion?: unknown; dias?: unknown; insumos?: unknown };
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const plazas = Math.floor(Number(c.plazas));
  const ocupacion = Number(c.ocupacion);
  const dias = Math.floor(Number(c.dias));
  const insumos = (Array.isArray(c.insumos) ? c.insumos : []).filter((i): i is Insumo => INSUMO_IDS.includes(i as Insumo));
  if (!(plazas >= 1 && plazas <= 2000)) return NextResponse.json({ error: "Indicá cuántas plazas tiene el alojamiento" }, { status: 400 });
  if (!(ocupacion > 0 && ocupacion <= 100)) return NextResponse.json({ error: "Indicá la ocupación" }, { status: 400 });
  if (!(dias >= 1 && dias <= 365)) return NextResponse.json({ error: "Indicá los días" }, { status: 400 });
  if (!insumos.length) return NextResponse.json({ error: "Elegí al menos un producto del desayuno" }, { status: 400 });

  const cfg = await leerConfig();
  const [pedidos, recomendados, todos] = await Promise.all([
    combosTienda({ tipo: "PEDIDO_NICHO", nicho: "hoteleria", activo: true }),
    productosTienda({ where: { nichos: { has: "hoteleria" } }, take: 80 }),
    productosTienda({ where: { OR: insumos.map((i) => ({ producto: { contains: INSUMOS[i].nombre.split(" ")[0], mode: "insensitive" as const } })) }, take: 120 }),
  ]);
  const catalogo = new Map<string, ProductoTienda>();
  for (const p of [...pedidos.flatMap((x) => x.items.map((i) => i.producto)), ...recomendados, ...todos]) catalogo.set(p.codigo, p);
  const desayunos = desayunosDe(plazas, ocupacion, dias);
  const filas = cotizarDesayunos(desayunos, insumos, [...catalogo.values()]);
  const lineas = filas.map((f) => ({ producto: catalogo.get(f.codigo)!, cantidad: f.cantidad, insumo: INSUMOS[f.insumo].nombre, necesario: f.necesario }));
  const total = lineas.reduce((s, l) => s + l.producto.precio * l.cantidad, 0);
  return NextResponse.json({ desayunos, lineas, total, porDesayuno: desayunos ? total / desayunos : 0, compraMinima: cfg.compraMinima });
}
