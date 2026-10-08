-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('PENDIENTE_PAGO', 'PAGADO', 'EN_COMPRA', 'PREPARADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('MERCADOPAGO', 'TRANSFERENCIA');

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "cpEntregaPropia" TEXT NOT NULL DEFAULT '5152,5000-5022',
ADD COLUMN     "cpOrigen" TEXT NOT NULL DEFAULT '5152',
ADD COLUMN     "emailContacto" TEXT,
ADD COLUMN     "entregaPropiaActiva" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tablaEnvios" JSONB,
ADD COLUMN     "tablaEnviosRevisada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transferenciaDatos" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "medioPago" "MedioPago" NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "calle" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "cp" TEXT NOT NULL,
    "notas" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "envioCobrado" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "costoProductos" DECIMAL(12,2) NOT NULL,
    "costoEnvioReal" DECIMAL(12,2) NOT NULL,
    "comisionPago" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costoPackaging" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "envioOpcionId" TEXT NOT NULL,
    "envioNombre" TEXT NOT NULL,
    "envioPlazo" TEXT,
    "envioOrigen" TEXT NOT NULL,
    "pesoTotalG" INTEGER NOT NULL,
    "bultos" INTEGER NOT NULL,
    "tracking" TEXT,
    "mpPreferenceId" TEXT,
    "mpPaymentId" TEXT,
    "pagadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "producto" TEXT NOT NULL,
    "presentacion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "costoUnitario" DECIMAL(12,2) NOT NULL,
    "comboSlug" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "estado" "EstadoPedido" NOT NULL,
    "nota" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_token_key" ON "Order"("token");

-- CreateIndex
CREATE INDEX "Order_estado_createdAt_idx" ON "Order"("estado", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_fecha_idx" ON "OrderEvent"("orderId", "fecha");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

