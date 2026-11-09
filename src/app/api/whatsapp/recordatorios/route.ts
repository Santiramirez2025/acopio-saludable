// La llama un programador cada 30 minutos (GitHub Actions). Es segura de llamar de más:
// cada charla recibe un solo recordatorio, y fuera de 8 a 21 h no manda nada.
// No devuelve teléfonos ni nombres, solo cuántos salieron.
// Acceso (cron-acceso): con RECORDATORIOS_SECRET, solo el Bearer correcto; sin él, abierta con freno por IP.

import { NextResponse } from "next/server";
import { correrRecordatorios } from "@/lib/whatsapp-recordatorio-correr";
import { recordatoriosAutorizado, RECORDATORIOS_MAX_POR_IP, RECORDATORIOS_VENTANA_MS } from "@/lib/cron-acceso";
import { admiteFreno, ipDe } from "@/lib/freno";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!recordatoriosAutorizado(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!process.env.RECORDATORIOS_SECRET?.trim() && !admiteFreno(`recordatorios:${ipDe(req)}`, RECORDATORIOS_MAX_POR_IP, RECORDATORIOS_VENTANA_MS)) {
    return NextResponse.json({ error: "Demasiados pedidos, esperá unos minutos" }, { status: 429 });
  }
  return NextResponse.json(await correrRecordatorios());
}
