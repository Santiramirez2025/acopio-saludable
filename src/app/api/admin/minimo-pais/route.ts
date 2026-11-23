// 23/11: compra mínima para el resto del país (envíos por correo). Santiago la bajó para vender el Trío por correo
// cobrando el envío. Cambia solo ese número, sin tocar el resto de la configuración.
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { minimo?: number };
  const minimo = Math.round(Number(b.minimo));
  if (!Number.isFinite(minimo) || minimo < 0 || minimo > 200_000) return NextResponse.json({ error: "minimo entre 0 y 200000" }, { status: 400 });
  await prisma.setting.update({ where: { id: 1 }, data: { compraMinima: minimo } });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, minimo });
}
