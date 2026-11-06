// Todos los días a la mañana: baja la lista del día de La Granja del Centro y aplica los cambios.
import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron-acceso";
import { conRegistro } from "@/lib/salud";
import { actualizarDesdeLaGranja, avisarResultadoLista } from "@/lib/listas-aplicar";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  // Un «error» de la lista (no la pudo bajar, no trae nuestros productos) cuenta como falla: así se reintenta.
  const r = await conRegistro("listas", () => actualizarDesdeLaGranja().then((x) => {
    if ("error" in x && !/ya se aplic/i.test(x.error)) throw new Error(x.error); // «ya se aplicó» = la del día ya está: está bien
    return x;
  })).catch((e) => ({ error: String(e) }));
  await avisarResultadoLista(r);
  return NextResponse.json(r);
}
