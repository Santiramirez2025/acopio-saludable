// Lo llama el cron de Vercel cada 15 minutos: publica en Instagram y Facebook lo que ya llegó a su hora.

import { NextResponse } from "next/server";
import { conRegistro } from "@/lib/salud";
import { correrProgramadas } from "@/lib/programador";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const r = await conRegistro("publicaciones", () => correrProgramadas(), (x) => (x.publicada ? `#${x.publicada} ${x.red} ${x.ok ? "ok" : `error: ${x.error}`}` : "nada para publicar"));
  return NextResponse.json(r);
}
