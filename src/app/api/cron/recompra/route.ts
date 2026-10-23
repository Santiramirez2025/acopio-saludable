// Recompra a los 20–25 días de entregado. Lo llama el cron de Vercel de lunes a sábado a las 10:40 (hora argentina).
import { NextResponse } from "next/server";
import { conRegistro } from "@/lib/salud";
import { correrRecompra } from "@/lib/recompra";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await conRegistro("recompra", () => correrRecompra()));
}
