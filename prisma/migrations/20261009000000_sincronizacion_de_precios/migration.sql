-- CreateEnum
CREATE TYPE "EstadoCambio" AS ENUM ('APLICADO', 'PENDIENTE', 'RECHAZADO');

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "syncTokenHash" TEXT,
ADD COLUMN     "umbralAutoPct" DECIMAL(5,2) NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "PriceSync" (
    "id" SERIAL NOT NULL,
    "origen" TEXT NOT NULL,
    "modo" TEXT NOT NULL,
    "completo" BOOLEAN NOT NULL DEFAULT false,
    "recibidos" INTEGER NOT NULL,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSyncItem" (
    "id" SERIAL NOT NULL,
    "syncId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "producto" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "costoAntes" DECIMAL(12,2),
    "costoNuevo" DECIMAL(12,2),
    "precioAntes" DECIMAL(12,2),
    "precioNuevo" DECIMAL(12,2),
    "pct" DECIMAL(9,2),
    "estado" "EstadoCambio" NOT NULL,
    "resueltoAt" TIMESTAMP(3),

    CONSTRAINT "PriceSyncItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceSync_createdAt_idx" ON "PriceSync"("createdAt");

-- CreateIndex
CREATE INDEX "PriceSyncItem_syncId_estado_idx" ON "PriceSyncItem"("syncId", "estado");

-- AddForeignKey
ALTER TABLE "PriceSyncItem" ADD CONSTRAINT "PriceSyncItem_syncId_fkey" FOREIGN KEY ("syncId") REFERENCES "PriceSync"("id") ON DELETE CASCADE ON UPDATE CASCADE;

