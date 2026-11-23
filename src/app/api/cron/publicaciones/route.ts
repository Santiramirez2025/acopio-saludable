// Lo llama el cron de Vercel cada 15 minutos: publica en Instagram y Facebook lo que ya llegó a su hora.

import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron-acceso";
import { conRegistro } from "@/lib/salud";
import { conCandado, tomarCandado } from "@/lib/cron-candado";
import { correrProgramadas } from "@/lib/programador";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const VENTANA_PUBLICACIONES_MIN = 10;

export async function GET(req: Request) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  // Candado de 10 min (Rodri, 23/11): el cron corre cada 15 y cada corrida dura como mucho 5 (maxDuration), así que
  // nunca se pisan dos. Sin él, dos llamadas a la vez (header de Vercel falsificado mientras no esté CRON_SECRET)
  // podían publicar dos veces la misma: la segunda devolvía a la cola una publicación atrasada que la primera
  // estaba subiendo («PUBLICANDO» con fecha de hace más de 20 min) y la tomaba de nuevo.
  const r = await conCandado(
    "publicaciones",
    () => conRegistro("publicaciones", () => correrProgramadas(), (x) => (x.publicada ? `#${x.publicada} ${x.red} ${x.ok ? "ok" : `error: ${x.error}`}` : "nada para publicar")),
    (n) => tomarCandado(n, VENTANA_PUBLICACIONES_MIN),
  );
  return NextResponse.json(r);
}
