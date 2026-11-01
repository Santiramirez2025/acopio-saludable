// Sube un video a la página de Facebook de Acopio SIN publicarlo, para usarlo en anuncios
// (en el Administrador de anuncios aparece en «Videos de la página»). Solo administrador.
// POST { video: URL https pública del .mp4, titulo } → { id }
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { paginaMeta } from "@/lib/meta-mensajes";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { video?: string; titulo?: string };
  if (!b.video || !/^https:\/\/\S+$/.test(b.video)) return NextResponse.json({ error: "Falta video (URL https)" }, { status: 400 });
  const p = await paginaMeta();
  if (!p) return NextResponse.json({ error: "El token no ve la página" }, { status: 503 });
  const q = new URLSearchParams({ file_url: b.video, published: "false", title: (b.titulo ?? "Video para anuncio").slice(0, 120), description: (b.titulo ?? "").slice(0, 500) });
  const r = await fetch(`https://graph.facebook.com/v21.0/${p.id}/videos`, {
    method: "POST",
    headers: { authorization: `Bearer ${p.token}`, "content-type": "application/x-www-form-urlencoded" },
    body: q,
    signal: AbortSignal.timeout(110_000),
  });
  const j = (await r.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!r.ok || !j.id) return NextResponse.json({ error: j.error?.message ?? `HTTP ${r.status}` }, { status: 502 });
  return NextResponse.json({ ok: true, id: j.id });
}
