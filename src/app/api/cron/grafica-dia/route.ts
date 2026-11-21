// Gráfica del día siguiente a quien escribió ayer y no compró (Santiago, 21/11). Cron de Vercel todos los días a
// las 11:20 y de lunes a sábado también a las 18:20 (hora argentina). Desde el panel: ?simular=1 muestra a quién iría.
import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron-acceso";
import { esAdmin } from "@/lib/admin-acceso";
import { conRegistro } from "@/lib/salud";
import { correrGraficaDiaSiguiente } from "@/lib/grafica-dia-siguiente";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const simular = new URL(req.url).searchParams.get("simular") === "1";
  if (!cronAutorizado(req) && !(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (simular) return NextResponse.json(await correrGraficaDiaSiguiente({ simular: true }));
  return NextResponse.json(await conRegistro("grafica-dia", () => correrGraficaDiaSiguiente()));
}
