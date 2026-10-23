// Lo llama el cron de Vercel cada 15 minutos. La función se protege sola: corre como mucho
// cada 10 minutos, solo de 9 a 22 y con tope diario de avisos.

import { NextResponse } from "next/server";
import { conRegistro, vigilar } from "@/lib/salud";
import { correrRadar } from "@/lib/radar-correr";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // puede reintentar una tarea del día que falló

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const r = await conRegistro("radar", () => correrRadar(), (x) => `${x.revisadas} cuentas, ${x.avisos} avisos${x.motivo ? `, ${x.motivo}` : ""}`);
  // De paso, vigila que las tareas del día hayan corrido.
  const alertas = await vigilar().catch(() => []);
  return NextResponse.json({ ...r, alertas });
}
