// Estado de las tareas automáticas, solo para el administrador. GET → última corrida de cada una.
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { estadoTexto, ultimasCorridas } from "@/lib/salud";
import { secretosPresentes } from "@/lib/controles";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  // node: versión real del runtime en producción, para comprobar parches (ej. CVE-2026-111497). Solo admin.
  // secretos: solo si existen (true/false), nunca el valor.
  return NextResponse.json({ node: process.version, secretos: secretosPresentes(), texto: await estadoTexto(), corridas: await ultimasCorridas() });
}
