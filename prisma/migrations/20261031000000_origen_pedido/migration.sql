-- De dónde vino cada pedido (anuncio, Google, link compartido, WhatsApp, prospección).
-- Texto corto y legible; sin datos personales.
ALTER TABLE "Order" ADD COLUMN "origen" TEXT;
