-- Laboratorio TikTok: cada variante que se sube, sus números y si ganó (pasa a Instagram, Facebook y YouTube).
CREATE TABLE IF NOT EXISTS "VideoTest" (
  "id" SERIAL PRIMARY KEY,
  "video" TEXT NOT NULL,
  "receta" TEXT NOT NULL,
  "gancho" TEXT,
  "ia" BOOLEAN NOT NULL DEFAULT false,
  "programado" TIMESTAMPTZ(6),
  "url" TEXT,
  "estado" TEXT NOT NULL DEFAULT 'PROGRAMADO',
  "vistas" INTEGER,
  "likes" INTEGER,
  "comentarios" INTEGER,
  "compartidos" INTEGER,
  "guardados" INTEGER,
  "retencion" REAL,
  "puntaje" REAL,
  "medido" TIMESTAMPTZ(6),
  "videoUrl" TEXT,
  "promovido" TIMESTAMPTZ(6),
  "nota" TEXT,
  "creado" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "VideoTest_creado_idx" ON "VideoTest" ("creado");
