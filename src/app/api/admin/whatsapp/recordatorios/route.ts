// Para el panel: a quién le saldría el recordatorio ahora y con qué texto. No manda nada.

import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { textoParaPanel } from "@/lib/whatsapp-interactivo";
import { enHorario, planRecordatorio } from "@/lib/whatsapp-recordatorio";
import { pendientes } from "@/lib/whatsapp-recordatorio-correr";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const lista = await pendientes();
  return NextResponse.json({ enHorario: enHorario(), cantidad: lista.length, lista: lista.map((p) => ({ telefono: p.telefono, nombre: p.nombre, mensaje: textoParaPanel(planRecordatorio(p)) })) });
}
