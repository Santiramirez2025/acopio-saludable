// Todos los días a la mañana: baja la lista del día de La Granja del Centro y aplica los cambios.
import { NextResponse } from "next/server";
import { actualizarDesdeLaGranja, avisarResultadoLista } from "@/lib/listas-aplicar";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const r = await actualizarDesdeLaGranja();
  await avisarResultadoLista(r);
  return NextResponse.json(r);
}
