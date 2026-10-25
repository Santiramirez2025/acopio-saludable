// El celular publica la charla que tiene con un agente para que la TV la muestre.  POST { agente|null, estado, mensajes }
import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/admin-acceso";
import { IDS_AGENTES } from "@/lib/agentes";
import { publicarCharla } from "@/lib/tv";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { agente?: string | null; estado?: string; mensajes?: { rol?: string; texto?: string }[] };
  const agente = b.agente && IDS_AGENTES.includes(b.agente) ? b.agente : null;
  const mensajes = (Array.isArray(b.mensajes) ? b.mensajes : []).filter((m) => m && (m.rol === "user" || m.rol === "assistant") && m.texto).map((m) => ({ rol: m.rol as "user" | "assistant", texto: String(m.texto) }));
  await publicarCharla({ agente, estado: String(b.estado ?? ""), mensajes });
  return NextResponse.json({ ok: true });
}
