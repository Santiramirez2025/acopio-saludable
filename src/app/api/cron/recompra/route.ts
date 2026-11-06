// Recompra a los 20–25 días de entregado. Lo llama el cron de Vercel de lunes a sábado a las 10:40 (hora argentina).
import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron-acceso";
import { conRegistro } from "@/lib/salud";
import { correrRecompra } from "@/lib/recompra";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await conRegistro("recompra", () => correrRecompra()));
}
