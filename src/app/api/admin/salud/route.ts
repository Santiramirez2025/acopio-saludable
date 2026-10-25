// Estado de las tareas automáticas, solo para el administrador. GET → última corrida de cada una.
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { estadoTexto, ultimasCorridas } from "@/lib/salud";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ texto: await estadoTexto(), corridas: await ultimasCorridas() });
}
