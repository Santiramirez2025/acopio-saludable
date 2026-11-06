// Captación orgánica diaria. Lo llama el cron de Vercel de lunes a sábado a las 9:05 (hora argentina).
import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron-acceso";
import { conRegistro } from "@/lib/salud";
import { correrOrganico } from "@/lib/organico";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await conRegistro("organico", () => correrOrganico()));
}
