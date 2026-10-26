// Manda el reparto de hoy al WhatsApp de Santiago: un mensaje por parada, en el orden del recorrido.
import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/admin-acceso";
import { mandarReparto } from "@/lib/reparto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await mandarReparto());
}
