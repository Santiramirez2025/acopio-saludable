// Lo llama el cron de Vercel cada 15 minutos. La función se protege sola: corre como mucho
// cada 10 minutos, solo de 9 a 22 y con tope diario de avisos.

import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron-acceso";
import { conRegistro, vigilar } from "@/lib/salud";
import { correrRadar } from "@/lib/radar-correr";
import { rescatarCharlasMudas } from "@/lib/atencion";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // puede reintentar una tarea del día que falló

export async function GET(req: Request) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const r = await conRegistro("radar", () => correrRadar(), (x) => `${x.revisadas} cuentas, ${x.avisos} avisos${x.motivo ? `, ${x.motivo}` : ""}`);
  // Ninguna charla en manos de una persona queda sin respuesta más de 20 minutos: vuelve al vendedor.
  const mudas = await rescatarCharlasMudas().catch((e) => {
    console.error("rescate de charlas mudas falló", e);
    return { revisadas: 0, contestadas: 0 };
  });
  // De paso, vigila que las tareas del día hayan corrido.
  const alertas = await vigilar().catch(() => []);
  return NextResponse.json({ ...r, alertas, mudas });
}
