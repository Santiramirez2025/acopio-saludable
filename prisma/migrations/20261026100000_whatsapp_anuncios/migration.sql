-- De que anuncio viene cada charla de WhatsApp.
--
-- Cuando alguien toca un anuncio "clic a WhatsApp", el primer mensaje llega con un bloque
-- "referral": el id del anuncio, su titulo y el ctwa_clid, que es el identificador del clic.
-- Sin guardarlo no se sabe que anuncio trae gente que compra, y no se le puede devolver a
-- Meta la compra (API de conversiones) para que optimice por ventas y no por mensajes.
--
-- Se guarda el primer anuncio (de donde vino) y el ultimo (que la trajo de vuelta).

ALTER TABLE "WhatsappConversacion"
  ADD COLUMN "anuncioId"        TEXT,
  ADD COLUMN "anuncioTitulo"    TEXT,
  ADD COLUMN "ctwaClid"         TEXT,
  ADD COLUMN "primerAnuncioId"  TEXT,
  ADD COLUMN "anuncioFecha"     TIMESTAMPTZ;

CREATE INDEX "WhatsappConversacion_anuncioId_idx" ON "WhatsappConversacion" ("anuncioId");
