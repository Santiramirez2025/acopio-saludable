-- Entrar al panel sin escribir la contraseña: la PC pide acceso y Santiago lo aprueba desde el WhatsApp.
CREATE TABLE IF NOT EXISTS "AccesoPendiente" (
  "codigo" TEXT PRIMARY KEY,
  "aprobar" TEXT NOT NULL UNIQUE,
  "detalle" TEXT,
  "aprobado" BOOLEAN NOT NULL DEFAULT false,
  "usado" BOOLEAN NOT NULL DEFAULT false,
  "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
