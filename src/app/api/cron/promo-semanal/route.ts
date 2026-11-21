// Promo de la semana a clientes que ya compraron. Lo llama el cron de Vercel de lunes a sábado a las 11:40 (hora argentina):
// 21/11 (Santiago: «esperamos un par de días y pum, la gráfica») le llega a cada cliente 2 días después de su compra, una vez por semana.
// Si el equipo no dejó una promo vigente, no sale nada.
import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron-acceso";
import { conRegistro } from "@/lib/salud";
import { correrPromo } from "@/lib/promo-semanal";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await conRegistro("promo-semanal", () => correrPromo()));
}
