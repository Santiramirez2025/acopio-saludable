// Lo llama el cron de Vercel cada 15 minutos. La función se protege sola: corre como mucho
// cada 10 minutos, solo de 9 a 22 y con tope diario de avisos.

import { NextResponse } from "next/server";
import { correrRadar } from "@/lib/radar-correr";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await correrRadar());
}
