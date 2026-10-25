// Qué convierte en el chat, solo para el administrador. GET ?dias=7
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { analizarCharlas } from "@/lib/aprendizaje";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const dias = Math.min(60, Math.max(1, Number(new URL(req.url).searchParams.get("dias")) || 7));
  return NextResponse.json(await analizarCharlas(dias));
}
