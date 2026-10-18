-- Comentarios de Instagram y Facebook ya contestados: Meta reintenta webhooks y no hay que contestar dos veces.
CREATE TABLE IF NOT EXISTS "ComentarioAtendido" (
  "id" TEXT PRIMARY KEY,
  "canal" TEXT NOT NULL,
  "texto" TEXT,
  "dm" BOOLEAN NOT NULL DEFAULT false,
  "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
