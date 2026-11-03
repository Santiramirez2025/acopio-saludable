-- Envío fijo en la zona de reparto propio cuando el pedido no llega al mínimo (0 = mínimo obligatorio).
ALTER TABLE "Setting" ADD COLUMN "envioBajoMinimo" DECIMAL(12,2) NOT NULL DEFAULT 3000;
