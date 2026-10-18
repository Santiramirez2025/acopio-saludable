// La llama un programador cada 30 minutos (GitHub Actions). Es segura de llamar de más:
// cada charla recibe un solo recordatorio, y fuera de 8 a 21 h no manda nada.
// No devuelve teléfonos ni nombres, solo cuántos salieron.

import { NextResponse } from "next/server";
import { correrRecordatorios } from "@/lib/whatsapp-recordatorio-correr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await correrRecordatorios());
}
