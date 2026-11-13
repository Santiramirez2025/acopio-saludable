// Corregir los datos de entrega de un pedido (calle, ciudad, ubicación) desde los agentes.
// 12/11: el pedido de Olga quedó con ciudad «A confirmar» y el mapa la mandaba a Córdoba capital.
// No le escribe al cliente.
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: number; codigo?: string; calle?: string; ciudad?: string; ubicacion?: string; notas?: string };
  const id = b.id ?? Number.parseInt(String(b.codigo ?? "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: "Falta id o codigo (AS-00051)" }, { status: 400 });
  const data: Record<string, string> = {};
  if (b.calle?.trim()) data.calle = b.calle.trim().slice(0, 160);
  if (b.ciudad?.trim()) data.ciudad = b.ciudad.trim().slice(0, 80);
  if (b.ubicacion?.trim()) data.ubicacion = b.ubicacion.trim().slice(0, 200);
  // 13/11: la nota sale en la tarjeta de la pizarra (un cambio de producto que pidió el cliente, el horario).
  if (b.notas?.trim()) data.notas = b.notas.trim().slice(0, 300);
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada para cambiar (calle, ciudad, ubicacion, notas)" }, { status: 400 });
  const p = await prisma.order.update({ where: { id }, data, select: { id: true, calle: true, ciudad: true, ubicacion: true, notas: true } });
  revalidatePath("/admin/pedidos");
  return NextResponse.json({ ok: true, pedido: p });
}
