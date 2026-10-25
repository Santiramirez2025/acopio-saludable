// Voz natural de un agente. POST { texto, agente } → audio/mpeg. 503 si no hay OPENAI_API_KEY.
import { NextResponse } from "next/server";
import { esAdminOTv as esAdmin } from "@/lib/admin-acceso";
import { hablar, hayVoz } from "@/lib/voz-agentes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!hayVoz()) return NextResponse.json({ error: "Falta OPENAI_API_KEY" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { texto?: string; agente?: string };
  if (!b.texto?.trim()) return NextResponse.json({ error: "Falta texto" }, { status: 400 });
  const r = await hablar(b.texto, String(b.agente ?? ""));
  if (!r.ok || !r.body) return NextResponse.json({ error: `Voz: ${r.status} ${(await r.text()).slice(0, 160)}` }, { status: 502 });
  return new Response(r.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
}
