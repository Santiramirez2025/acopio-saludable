-- Captación orgánica: negocios para contactar por WhatsApp (de a pocos por día) y lo que el sistema va aprendiendo.
CREATE TABLE IF NOT EXISTS "Prospecto" (
  "telefono" TEXT PRIMARY KEY,
  "negocio" TEXT NOT NULL,
  "rubro" TEXT NOT NULL,
  "localidad" TEXT,
  "placeId" TEXT,
  "rating" DOUBLE PRECISION,
  "resenas" INTEGER,
  "origen" TEXT NOT NULL DEFAULT 'semilla',
  -- nuevo | enviado | fallo | respondio | interesado | cliente | baja
  "estado" TEXT NOT NULL DEFAULT 'nuevo',
  "motivo" TEXT,
  "enviado" TIMESTAMPTZ(6),
  "creado" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Prospecto_estado_idx" ON "Prospecto" ("estado");

CREATE TABLE IF NOT EXISTS "Aprendizaje" (
  "id" SERIAL PRIMARY KEY,
  -- vendedor (reglas para el bot) | negocios (qué rubro y mensaje responde) | contenido
  "canal" TEXT NOT NULL,
  "texto" TEXT NOT NULL,
  "evidencia" TEXT,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
