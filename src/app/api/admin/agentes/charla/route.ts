// Charlas de Santiago con cada agente, guardadas en el servidor (se ven desde cualquier compu, celular o TV,
// y el agente las tiene en cuenta la próxima vez que hablan). Solo administrador.
//   GET ?agente=gerente → { mensajes: [{ role, content, orden?, cuando }] } (las últimas 40)
//   POST { agente, mensajes: [{ role, content, orden? }] } → agrega
import { NextResponse } from "next/server";
import { esAdminOTv as esAdmin } from "@/lib/admin-acceso";
import { IDS_AGENTES } from "@/lib/agentes";
import { guardarCharla, leerCharla } from "@/lib/agentes-chat";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const agente = new URL(req.url).searchParams.get("agente") ?? "";
  if (!IDS_AGENTES.includes(agente)) return NextResponse.json({ error: "Agente desconocido" }, { status: 400 });
  return NextResponse.json({ mensajes: await leerCharla(agente, 40) });
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { agente?: string; mensajes?: { role?: string; content?: string; orden?: string | null }[] };
  const agente = String(b.agente ?? "");
  if (!IDS_AGENTES.includes(agente)) return NextResponse.json({ error: "Agente desconocido" }, { status: 400 });
  const lista = (b.mensajes ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(0, 20)
    .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 4000), orden: m.orden ? String(m.orden).slice(0, 1000) : null }));
  await guardarCharla(agente, lista);
  return NextResponse.json({ ok: true, guardados: lista.length });
}
