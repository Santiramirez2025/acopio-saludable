// 22/11: el plazo guardado de la entrega propia decía «24 a 48 hs hábiles» y la ficha, el carrito y el bot lo repetían
// aunque el reparto sale todos los días a las 16. Esto cambia solo ese texto, sin tocar el resto de la configuración.
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { plazo?: string };
  const plazo = String(b.plazo ?? "").trim().slice(0, 60);
  if (plazo.length < 5) return NextResponse.json({ error: "Falta el plazo" }, { status: 400 });
  await prisma.setting.update({ where: { id: 1 }, data: { plazoEntregaPropia: plazo } });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, plazo });
}
