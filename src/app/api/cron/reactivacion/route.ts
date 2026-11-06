// Lo llama el cron de Vercel de lunes a sábado a las 9:30 (hora argentina).
import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron-acceso";
import { conRegistro } from "@/lib/salud";
import { correrReactivacion } from "@/lib/reactivacion";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await conRegistro("reactivacion", () => correrReactivacion()));
}
