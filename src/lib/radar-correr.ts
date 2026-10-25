// Radar de Instagram: lee las publicaciones de las cuentas vigiladas (business discovery de la
// API de Instagram) y avisa a Santiago por WhatsApp con un comentario listo.

import { prisma } from "@/lib/prisma";
import { paginaMeta } from "@/lib/meta-mensajes";
import { avisarSantiago } from "@/lib/avisos";
import { enHorario, nuevas, pedidoComentario, textoAviso, TOPE_DIA, type Publicacion } from "@/lib/radar";

const GRAPH = "https://graph.facebook.com/v21.0";
const ESPERA_MIN = 10;

type Discovery = {
  business_discovery?: { username: string; followers_count?: number; media?: { data?: { id: string; caption?: string; permalink: string; timestamp: string; like_count?: number; comments_count?: number }[] } };
  error?: { message?: string };
};

/** Datos públicos de una cuenta comercial o de creador, y sus últimas publicaciones. */
export async function leerCuenta(username: string, cantidad = 3): Promise<{ ok: true; seguidores: number | null; pubs: Publicacion[] } | { ok: false; error: string }> {
  const p = await paginaMeta();
  if (!p?.instagram) return { ok: false, error: "No hay Instagram conectado a la página" };
  const u = username.replace(/^@/, "").trim();
  const campos = `business_discovery.username(${u}){username,followers_count,media.limit(${cantidad}){id,caption,permalink,timestamp,like_count,comments_count}}`;
  try {
    const res = await fetch(`${GRAPH}/${p.instagram}?fields=${encodeURIComponent(campos)}`, { headers: { authorization: `Bearer ${p.token}` }, signal: AbortSignal.timeout(15_000) });
    const j = (await res.json()) as Discovery;
    if (!res.ok || !j.business_discovery) return { ok: false, error: j.error?.message ?? `HTTP ${res.status}` };
    const b = j.business_discovery;
    const seguidores = b.followers_count ?? null;
    return {
      ok: true,
      seguidores,
      pubs: (b.media?.data ?? []).map((m) => ({ id: m.id, username: b.username, seguidores, caption: m.caption ?? "", permalink: m.permalink, timestamp: m.timestamp, likes: m.like_count ?? null, comentarios: m.comments_count ?? null })),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Escribe el comentario. Devuelve también el motivo si no hay comentario, para poder diagnosticarlo. */
export async function escribirComentarioConMotivo(p: Publicacion): Promise<{ texto: string | null; motivo?: string }> {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return { texto: null, motivo: "falta ANTHROPIC_API_KEY" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.VENDEDOR_MODELO || "claude-haiku-5-5", max_tokens: 300, messages: [{ role: "user", content: pedidoComentario(p) }] }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      const cuerpo = (await res.text()).slice(0, 300);
      console.error("radar: el modelo rechazó el comentario", res.status, cuerpo);
      return { texto: null, motivo: `modelo ${res.status}: ${cuerpo}` };
    }
    const j = (await res.json()) as { content?: { type: string; text?: string }[]; stop_reason?: string };
    const t = (j.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim().replace(/^["«]|["»]$/g, "");
    if (!t) return { texto: null, motivo: `vacío (${j.stop_reason}; ${(j.content ?? []).map((b) => b.type).join(",")})` };
    if (/NO_COMENTAR/.test(t)) return { texto: null, motivo: "el modelo eligió no comentar" };
    // Si hay que acortar, se corta en el último punto o signo para no dejar una frase a medias.
    if (t.length <= 220) return { texto: t };
    const corte = Math.max(...[".", "!", "?", "🌿", "🩷"].map((c) => t.slice(0, 220).lastIndexOf(c)));
    return { texto: corte > 80 ? t.slice(0, corte + 1).trim() : t.slice(0, 220) };
  } catch (e) {
    console.error("radar: falló escribir el comentario", e);
    return { texto: null, motivo: String(e).slice(0, 200) };
  }
}

async function escribirComentario(p: Publicacion): Promise<string | null> {
  const r = await escribirComentarioConMotivo(p);
  if (!r.texto) console.log("radar: sin comentario", p.username, r.motivo);
  return r.texto;
}

/** Una pasada del radar. Como mucho cada 10 minutos, de 9 a 22 y con tope diario de avisos. */
export async function correrRadar(forzar = false): Promise<{ revisadas: number; avisos: number; motivo?: string }> {
  if (!forzar && !enHorario()) return { revisadas: 0, avisos: 0, motivo: "fuera de horario" };
  const reservada = await prisma.$executeRaw`
    INSERT INTO "RadarCorrida" ("id", "fecha") VALUES (1, now())
    ON CONFLICT ("id") DO UPDATE SET "fecha" = now()
    WHERE "RadarCorrida"."fecha" < now() - make_interval(mins => ${ESPERA_MIN})`;
  if (!forzar && reservada === 0) return { revisadas: 0, avisos: 0, motivo: "corrió hace poco" };

  const cuentas = await prisma.$queryRaw<{ username: string }[]>`SELECT "username" FROM "RadarCuenta" WHERE "activo" = true`;
  const hoy = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM "RadarAviso" WHERE "fecha" > now() - interval '20 hours' AND "comentario" IS NOT NULL`;
  let quedan = TOPE_DIA - Number(hoy[0]?.n ?? 0);
  let avisos = 0;
  const pubs: Publicacion[] = [];
  for (const c of cuentas) {
    const r = await leerCuenta(c.username, 2);
    if (r.ok) pubs.push(...r.pubs);
  }
  const ids = pubs.map((p) => p.id);
  const vistas = ids.length ? await prisma.$queryRaw<{ mediaId: string }[]>`SELECT "mediaId" FROM "RadarAviso" WHERE "mediaId" = ANY(${ids})` : [];
  for (const p of nuevas(pubs, new Set(vistas.map((v) => v.mediaId)))) {
    if (quedan <= 0) break;
    const comentario = await escribirComentario(p);
    await prisma.$executeRaw`INSERT INTO "RadarAviso" ("mediaId", "username", "comentario") VALUES (${p.id}, ${p.username}, ${comentario}) ON CONFLICT DO NOTHING`;
    if (!comentario) continue;
    await avisarSantiago(`Comentar en @${p.username}`, textoAviso(p, comentario));
    avisos++;
    quedan--;
  }
  return { revisadas: cuentas.length, avisos };
}
