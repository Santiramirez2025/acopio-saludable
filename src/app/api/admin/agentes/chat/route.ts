// Hablar con un agente desde /admin/empresa. Solo administrador.
//   POST { agente, mensajes: [{ role: "user" | "assistant", content }] } → { respuesta, orden? }
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { charlarConAgente } from "@/lib/agentes-chat";
import { IDS_AGENTES } from "@/lib/agentes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { agente?: string; mensajes?: { role: string; content: string }[] };
  const agente = String(b.agente ?? "");
  if (!IDS_AGENTES.includes(agente)) return NextResponse.json({ error: "Agente desconocido" }, { status: 400 });
  const mensajes = (b.mensajes ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-16)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 2000) }));
  if (!mensajes.length || mensajes[mensajes.length - 1].role !== "user") return NextResponse.json({ error: "Falta tu mensaje" }, { status: 400 });
  try {
    return NextResponse.json(await charlarConAgente(agente, mensajes));
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 502 });
  }
}
