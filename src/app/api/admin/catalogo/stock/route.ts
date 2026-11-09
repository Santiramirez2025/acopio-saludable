// Marca productos sin stock o los vuelve a la venta, sin tocar precio, costo ni nada más.
// POST { codigos: string[], estado: "SIN_STOCK" | "ACTIVO", motivo?: string }
//
// Sin stock la ficha sigue en pie (dice «Sin stock por ahora» y ofrece avisar por WhatsApp), pero no se
// puede agregar al carrito, sale del catálogo y todo combo que lo lleve deja de venderse solo.
// Es reversible: el mismo pedido con estado "ACTIVO", o el selector «Estado» en /admin/productos/<código>.
// Solo cambia entre ACTIVO y SIN_STOCK: un BORRADOR queda como está.

import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const sinStock = await prisma.product.findMany({ where: { estado: "SIN_STOCK", visible: true }, select: { codigo: true, producto: true, presentacion: true, updatedAt: true }, orderBy: { codigo: "asc" } });
  return NextResponse.json({ sinStock });
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { codigos?: unknown; estado?: unknown };
  const estado = b.estado === "SIN_STOCK" || b.estado === "ACTIVO" ? b.estado : null;
  const codigos = Array.isArray(b.codigos) ? [...new Set(b.codigos.map(String).filter(Boolean))].slice(0, 50) : [];
  if (!estado || !codigos.length) return NextResponse.json({ error: "Mandá codigos (lista) y estado SIN_STOCK o ACTIVO" }, { status: 400 });

  const desde = estado === "SIN_STOCK" ? "ACTIVO" : "SIN_STOCK";
  const r = await prisma.product.updateMany({ where: { codigo: { in: codigos }, estado: desde }, data: { estado } });
  const ahora = await prisma.product.findMany({ where: { codigo: { in: codigos } }, select: { codigo: true, estado: true } });
  const combos = await prisma.combo.findMany({ where: { activo: true, items: { some: { codigo: { in: codigos } } } }, select: { slug: true } });

  for (const ruta of ["/", "/catalogo", "/combos", "/ofertas"]) revalidatePath(ruta);
  for (const c of codigos) revalidatePath(`/producto/${encodeURIComponent(c)}`);
  for (const c of combos) revalidatePath(`/combos/${c.slug}`);

  return NextResponse.json({
    cambiados: r.count,
    productos: ahora,
    noEncontrados: codigos.filter((c) => !ahora.some((p) => p.codigo === c)),
    combosAfectados: combos.map((c) => c.slug),
  });
}
