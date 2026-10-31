// Laboratorio TikTok (lo opera Fran). Solo administrador y agentes.
// GET ?dias=7 → { videos, ganadoras, resumen }
// POST { accion: "registrar", video, receta, gancho?, ia?, programado?, url?, nota? } → { id }
// POST { accion: "metricas", id, url?, vistas, likes, comentarios, compartidos, guardados, retencion? } → { puntaje }
// POST { accion: "estado", id, estado?: GANADOR|DESCARTADO|PUBLICADO, url?, videoUrl?, promovido?: true, nota? }
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { actualizar, elegirGanadoras, listar, medir, registrar } from "@/lib/tiktok-lab";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const dias = Math.min(60, Math.max(1, Number(new URL(req.url).searchParams.get("dias")) || 7));
  const videos = await listar(Math.max(dias, 14));
  const ganadoras = elegirGanadoras(videos);
  const recientes = videos.filter((v) => Date.now() - new Date(v.creado).getTime() < dias * 864e5);
  const medidos = recientes.filter((v) => v.vistas != null);
  const resumen = {
    subidos: recientes.length,
    medidos: medidos.length,
    vistas: medidos.reduce((s, v) => s + (v.vistas ?? 0), 0),
    mejor: medidos.sort((a, b) => (b.puntaje ?? 0) - (a.puntaje ?? 0))[0]?.receta ?? null,
  };
  return NextResponse.json({ videos: recientes, ganadoras, resumen });
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const n = (k: string) => (b[k] == null || b[k] === "" ? undefined : Number(b[k]));
  const s = (k: string) => (typeof b[k] === "string" && b[k] ? String(b[k]).slice(0, 500) : undefined);
  if (b.accion === "registrar") {
    if (!s("video") || !s("receta")) return NextResponse.json({ error: "Faltan video y receta" }, { status: 400 });
    return NextResponse.json({ ok: true, id: await registrar({ video: s("video") as string, receta: s("receta") as string, gancho: s("gancho"), ia: Boolean(b.ia), programado: s("programado"), url: s("url"), nota: s("nota") }) });
  }
  if (b.accion === "metricas") {
    if (!n("id")) return NextResponse.json({ error: "Falta id" }, { status: 400 });
    return NextResponse.json({ ok: true, puntaje: await medir(n("id") as number, { url: s("url"), vistas: n("vistas"), likes: n("likes"), comentarios: n("comentarios"), compartidos: n("compartidos"), guardados: n("guardados"), retencion: n("retencion") }) });
  }
  if (b.accion === "estado") {
    if (!n("id")) return NextResponse.json({ error: "Falta id" }, { status: 400 });
    await actualizar(n("id") as number, { estado: s("estado"), url: s("url"), videoUrl: s("videoUrl"), promovido: b.promovido === true, nota: s("nota") });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "accion: registrar | metricas | estado" }, { status: 400 });
}
