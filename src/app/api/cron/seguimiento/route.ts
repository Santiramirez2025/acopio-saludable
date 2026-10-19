// Lo llama el cron de Vercel de lunes a sábado a las 11 (hora argentina).
import { NextResponse } from "next/server";
import { correrSeguimiento } from "@/lib/seguimiento";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await correrSeguimiento());
}
