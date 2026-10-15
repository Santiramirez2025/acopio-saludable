-- Conversaciones de WhatsApp, guardadas.
--
-- Hasta ahora el hilo de cada charla vivia en memoria de la instancia y se perdia cuando
-- Vercel la reciclaba. Sin guardar nada no hay memoria entre sesiones, no se sabe quien
-- pregunto y no compro, no se puede ver donde se cae la gente ni contestar a mano cuando
-- el bot pide ayuda. Dos tablas: la conversacion (una por telefono) y sus mensajes.
--
-- El id del mensaje entrante es el wamid que manda Meta: usarlo de clave primaria hace que
-- una reentrega del webhook sea un INSERT que no inserta nada, y eso es el dedupe.

CREATE TABLE "WhatsappConversacion" (
  "telefono"      TEXT        NOT NULL,
  "nombre"        TEXT,
  -- bot: contesta el vendedor. persona: pidio hablar con alguien, el bot se calla.
  "estado"        TEXT        NOT NULL DEFAULT 'bot',
  "noLeidos"      INTEGER     NOT NULL DEFAULT 0,
  "ultimoMensaje" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "creado"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "WhatsappConversacion_pkey" PRIMARY KEY ("telefono")
);

CREATE INDEX "WhatsappConversacion_ultimoMensaje_idx" ON "WhatsappConversacion" ("ultimoMensaje" DESC);
CREATE INDEX "WhatsappConversacion_estado_idx" ON "WhatsappConversacion" ("estado");

CREATE TABLE "WhatsappMensaje" (
  "id"       TEXT        NOT NULL,
  "telefono" TEXT        NOT NULL,
  -- cliente | bot | persona
  "de"       TEXT        NOT NULL,
  "texto"    TEXT        NOT NULL,
  "fecha"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "WhatsappMensaje_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsappMensaje_telefono_fkey" FOREIGN KEY ("telefono") REFERENCES "WhatsappConversacion" ("telefono") ON DELETE CASCADE
);

CREATE INDEX "WhatsappMensaje_telefono_fecha_idx" ON "WhatsappMensaje" ("telefono", "fecha");
