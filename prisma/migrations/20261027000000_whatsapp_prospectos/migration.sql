-- Prospección: a quién le escribimos nosotros primero, de qué rubro es y si pidió que no le escribamos más.
ALTER TABLE "WhatsappConversacion" ADD COLUMN "prospecto" TEXT;
ALTER TABLE "WhatsappConversacion" ADD COLUMN "negocio" TEXT;
ALTER TABLE "WhatsappConversacion" ADD COLUMN "contactado" TIMESTAMPTZ(6);
ALTER TABLE "WhatsappConversacion" ADD COLUMN "baja" BOOLEAN NOT NULL DEFAULT false;
