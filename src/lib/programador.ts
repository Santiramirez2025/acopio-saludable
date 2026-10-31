// Programador propio de redes: hace lo de Metricool para Instagram y Facebook, sin tope mensual.
// Las publicaciones se guardan en la tabla "Publicacion" y el cron /api/cron/publicaciones (cada
// 15 minutos) publica las que ya llegaron a su hora, de a una por corrida para no pasar los 300 s.
// TikTok y YouTube siguen por Metricool: sus APIs publican en privado hasta que la app pase la
// auditoría de cada plataforma.

import { prisma } from "./prisma";
import { avisarSantiago } from "./avisos";
import { publicarEn, REDES_PROPIAS, type RedPropia } from "./publicar-reel";

export type Publicacion = {
  id: number; red: string; video: string | null; imagen: string | null; texto: string;
  fecha: Date; estado: string; intentos: number; resultado: string | null; quien: string | null; creada: Date; publicada: Date | null;
};

const URL_OK = /^https:\/\/\S+$/;
export const MAX_INTENTOS = 3;

export function validar(p: { red?: string; video?: string; imagen?: string; texto?: string; fecha?: string }): string | null {
  if (!p.red || !REDES_PROPIAS.includes(p.red as RedPropia)) return `red tiene que ser una de: ${REDES_PROPIAS.join(", ")}`;
  if (p.video && !URL_OK.test(p.video)) return "video tiene que ser una URL https pública";
  if (p.imagen && !URL_OK.test(p.imagen)) return "imagen tiene que ser una URL https pública";
  if (!p.video && !p.imagen) return "falta video o imagen";
  if ((p.red === "instagram_reel" || p.red === "facebook_reel") && !p.video) return "un reel necesita video";
  if ((p.red === "instagram_post" || p.red === "facebook_post") && !p.imagen) return "un post necesita imagen (para video usá el reel)";
  if (p.red !== "instagram_historia" && !p.texto?.trim()) return "falta el texto";
  if ((p.texto ?? "").length > 2200) return "el texto pasa los 2200 caracteres de Instagram";
  const f = p.fecha ? new Date(p.fecha) : null;
  if (!f || Number.isNaN(f.getTime())) return "fecha inválida (ISO con zona, ej. 2026-11-02T18:00:00-03:00)";
  return null;
}

export async function programar(p: { red: string; video?: string; imagen?: string; texto?: string; fecha: string; quien?: string }): Promise<number> {
  const r = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO "Publicacion" ("red", "video", "imagen", "texto", "fecha", "quien")
    VALUES (${p.red}, ${p.video ?? null}, ${p.imagen ?? null}, ${p.texto ?? ""}, ${new Date(p.fecha)}, ${p.quien ?? null})
    RETURNING "id"`;
  return r[0].id;
}

export async function listar(desde: Date, hasta: Date): Promise<Publicacion[]> {
  return prisma.$queryRaw<Publicacion[]>`SELECT * FROM "Publicacion" WHERE "fecha" BETWEEN ${desde} AND ${hasta} ORDER BY "fecha"`;
}

export async function cancelar(id: number): Promise<boolean> {
  const n = await prisma.$executeRaw`UPDATE "Publicacion" SET "estado" = 'CANCELADA' WHERE "id" = ${id} AND "estado" IN ('PROGRAMADA', 'ERROR')`;
  return n > 0;
}

export async function reprogramar(id: number, fecha: string, texto?: string): Promise<boolean> {
  const f = new Date(fecha);
  if (Number.isNaN(f.getTime())) return false;
  const n = texto === undefined
    ? await prisma.$executeRaw`UPDATE "Publicacion" SET "fecha" = ${f}, "estado" = 'PROGRAMADA', "intentos" = 0 WHERE "id" = ${id} AND "estado" <> 'PUBLICADA'`
    : await prisma.$executeRaw`UPDATE "Publicacion" SET "fecha" = ${f}, "texto" = ${texto}, "estado" = 'PROGRAMADA', "intentos" = 0 WHERE "id" = ${id} AND "estado" <> 'PUBLICADA'`;
  return n > 0;
}

/** Publica la más vieja que ya llegó a su hora. La toma con un UPDATE atómico para que dos corridas no la publiquen doble. */
export async function correrProgramadas(): Promise<{ publicada?: number; red?: string; ok?: boolean; error?: string; pendientes: number }> {
  // Si una corrida se cortó a mitad (más de 20 min «PUBLICANDO»), vuelve a la cola.
  await prisma.$executeRaw`UPDATE "Publicacion" SET "estado" = 'PROGRAMADA' WHERE "estado" = 'PUBLICANDO' AND "fecha" < now() - interval '20 minutes' AND "intentos" < ${MAX_INTENTOS}`;
  const tomadas = await prisma.$queryRaw<Publicacion[]>`
    UPDATE "Publicacion" SET "estado" = 'PUBLICANDO', "intentos" = "intentos" + 1
    WHERE "id" = (SELECT "id" FROM "Publicacion" WHERE "estado" = 'PROGRAMADA' AND "fecha" <= now() ORDER BY "fecha" LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING *`;
  const p = tomadas[0];
  const pendientes = (await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "Publicacion" WHERE "estado" = 'PROGRAMADA' AND "fecha" <= now()`)[0]?.n ?? 0;
  if (!p) return { pendientes };
  const r = await publicarEn(p.red as RedPropia, { video: p.video, imagen: p.imagen }, p.texto);
  if (r.ok) {
    await prisma.$executeRaw`UPDATE "Publicacion" SET "estado" = 'PUBLICADA', "publicada" = now(), "resultado" = ${r.id ?? "ok"} WHERE "id" = ${p.id}`;
    return { publicada: p.id, red: p.red, ok: true, pendientes };
  }
  const final = p.intentos >= MAX_INTENTOS;
  await prisma.$executeRaw`UPDATE "Publicacion" SET "estado" = ${final ? "ERROR" : "PROGRAMADA"}, "fecha" = ${final ? p.fecha : new Date(Date.now() + 15 * 60_000)}, "resultado" = ${r.error ?? "error"} WHERE "id" = ${p.id}`;
  if (final) await avisarSantiago(`No se pudo publicar en ${p.red}`, `Publicación #${p.id} (${p.red}) falló ${MAX_INTENTOS} veces: ${r.error}. Revisala en /api/admin/publicaciones.`, { mail: false }).catch(() => false);
  return { publicada: p.id, red: p.red, ok: false, error: r.error, pendientes };
}
