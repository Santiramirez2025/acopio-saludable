-- Compra mínima más baja en la zona de reparto propio (Villa Carlos Paz y sur de Punilla).
ALTER TABLE "Setting" ADD COLUMN "compraMinimaPropia" DECIMAL(12,2) NOT NULL DEFAULT 20000;
