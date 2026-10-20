// Corrige costos (y si se pide, precio o nombre) de productos ya cargados, sin tocar nada más.
// POST { items: [{ codigo, costo?, precioPublico?, producto? }] }. Registra el cambio en el historial.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { margenPct } from "@/lib/precios";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { items?: { codigo?: string; costo?: number; precioPublico?: number; producto?: string }[] };
  const salida: Record<string, unknown> = {};
  for (const it of (b.items ?? []).slice(0, 100)) {
    const codigo = String(it.codigo ?? "");
    const previo = await prisma.product.findUnique({ where: { codigo } });
    if (!previo) { salida[codigo] = "no existe"; continue; }
    const costo = Number.isFinite(it.costo) && Number(it.costo) >= 0 ? Number(it.costo) : Number(previo.costo);
    const precioPublico = Number.isFinite(it.precioPublico) && Number(it.precioPublico) > 0 ? Number(it.precioPublico) : Number(previo.precioPublico);
    const producto = typeof it.producto === "string" && it.producto.trim() ? it.producto.trim().slice(0, 120) : previo.producto;
    await prisma.$transaction([
      prisma.product.update({ where: { codigo }, data: { costo, precioPublico, producto, margenPct: margenPct(precioPublico, costo) } }),
      ...(costo !== Number(previo.costo) || precioPublico !== Number(previo.precioPublico)
        ? [prisma.priceHistory.create({ data: { codigo, costo, precioPublico, origen: "manual" } })]
        : []),
    ]);
    salida[codigo] = { costo: [Number(previo.costo), costo], precio: [Number(previo.precioPublico), precioPublico], margen: margenPct(precioPublico, costo) };
  }
  return NextResponse.json(salida);
}
