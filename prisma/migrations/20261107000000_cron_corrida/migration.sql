-- Registro de cada tarea automática: cuándo corrió, si salió bien y qué hizo. Para saber sin mirar logs.
CREATE TABLE IF NOT EXISTS "CronCorrida" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "ok" BOOLEAN NOT NULL,
  "detalle" TEXT,
  "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "CronCorrida_nombre_fecha_idx" ON "CronCorrida" ("nombre", "fecha" DESC);
