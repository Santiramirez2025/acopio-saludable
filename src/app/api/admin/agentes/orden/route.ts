// Santiago le deja una orden a un agente desde /admin/empresa. El agente la lee en su próxima corrida
// (llega como «PRIORIDAD: <agente> — ORDEN DE SANTIAGO …» en GET /api/admin/agentes). Solo administrador.
//   POST { agente, texto }
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { guardarOrden } from "@/lib/agentes-chat";
import { IDS_AGENTES } from "@/lib/agentes";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { agente?: string; texto?: string };
  const agente = String(b.agente ?? "");
  const texto = String(b.texto ?? "").trim();
  if (!IDS_AGENTES.includes(agente) || !texto) return NextResponse.json({ error: "Faltan agente y texto" }, { status: 400 });
  await guardarOrden(agente, texto);
  return NextResponse.json({ ok: true });
}
