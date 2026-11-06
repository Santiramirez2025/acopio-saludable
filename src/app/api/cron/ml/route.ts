// Parte diario de Mercado Libre y barrido de preguntas sin responder. Lunes a sábado 9:15 (hora argentina).
import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron-acceso";
import { conRegistro } from "@/lib/salud";
import { conectado, parteDiario } from "@/lib/mercadolibre";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!(await conectado())) return NextResponse.json({ ok: true, omitido: "Mercado Libre sin conectar" });
  return NextResponse.json({ texto: await conRegistro("ml", () => parteDiario({ avisar: true }), (t) => t.slice(0, 400)) });
}
