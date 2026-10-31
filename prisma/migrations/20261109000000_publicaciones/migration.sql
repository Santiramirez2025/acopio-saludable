-- Programador propio de Instagram y Facebook (reemplaza a Metricool en esas dos redes).
CREATE TABLE IF NOT EXISTS "Publicacion" (
  "id" SERIAL PRIMARY KEY,
  "red" TEXT NOT NULL,
  "video" TEXT,
  "imagen" TEXT,
  "texto" TEXT NOT NULL DEFAULT '',
  "fecha" TIMESTAMPTZ(6) NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'PROGRAMADA',
  "intentos" INTEGER NOT NULL DEFAULT 0,
  "resultado" TEXT,
  "quien" TEXT,
  "creada" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "publicada" TIMESTAMPTZ(6)
);
CREATE INDEX IF NOT EXISTS "Publicacion_estado_fecha_idx" ON "Publicacion" ("estado", "fecha");
