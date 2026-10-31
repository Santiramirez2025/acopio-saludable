// Laboratorio TikTok: se suben ~5 variantes por día, se miden a las 24 h y la que gana pasa al día
// siguiente a Instagram, Facebook (programador propio) y YouTube Shorts. Fran lo opera.

import { prisma } from "./prisma";

import { elegirGanadoras, puntaje, type VideoTest } from "./tiktok-puntaje";
export { elegirGanadoras, puntaje, type VideoTest };

export async function listar(dias: number): Promise<VideoTest[]> {
  return prisma.$queryRaw<VideoTest[]>`SELECT * FROM "VideoTest" WHERE "creado" > now() - make_interval(days => ${dias}) ORDER BY "creado" DESC`;
}

export async function registrar(t: { video: string; receta: string; gancho?: string; ia?: boolean; programado?: string; url?: string; nota?: string }): Promise<number> {
  const r = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO "VideoTest" ("video", "receta", "gancho", "ia", "programado", "url", "nota", "estado")
    VALUES (${t.video}, ${t.receta}, ${t.gancho ?? null}, ${Boolean(t.ia)}, ${t.programado ? new Date(t.programado) : null}, ${t.url ?? null}, ${t.nota ?? null}, ${t.url ? "PUBLICADO" : "PROGRAMADO"})
    RETURNING "id"`;
  return r[0].id;
}

export async function medir(id: number, m: { url?: string; vistas?: number; likes?: number; comentarios?: number; compartidos?: number; guardados?: number; retencion?: number }): Promise<number> {
  const p = puntaje(m);
  await prisma.$executeRaw`
    UPDATE "VideoTest" SET "url" = COALESCE(${m.url ?? null}, "url"), "vistas" = ${m.vistas ?? null}, "likes" = ${m.likes ?? null},
      "comentarios" = ${m.comentarios ?? null}, "compartidos" = ${m.compartidos ?? null}, "guardados" = ${m.guardados ?? null},
      "retencion" = ${m.retencion ?? null}, "puntaje" = ${p}, "medido" = now(),
      "estado" = CASE WHEN "estado" IN ('GANADOR', 'DESCARTADO') THEN "estado" ELSE 'MEDIDO' END
    WHERE "id" = ${id}`;
  return p;
}

export async function actualizar(id: number, c: { estado?: string; url?: string; videoUrl?: string; promovido?: boolean; nota?: string }): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "VideoTest" SET "estado" = COALESCE(${c.estado ?? null}, "estado"), "url" = COALESCE(${c.url ?? null}, "url"),
      "videoUrl" = COALESCE(${c.videoUrl ?? null}, "videoUrl"), "nota" = COALESCE(${c.nota ?? null}, "nota"),
      "promovido" = CASE WHEN ${Boolean(c.promovido)} THEN now() ELSE "promovido" END
    WHERE "id" = ${id}`;
}
