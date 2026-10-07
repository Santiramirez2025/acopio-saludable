-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EstadoProducto" AS ENUM ('ACTIVO', 'BORRADOR', 'SIN_STOCK');

-- CreateEnum
CREATE TYPE "TipoCombo" AS ENUM ('COMBO', 'PEDIDO_NICHO');

-- CreateTable
CREATE TABLE "Product" (
    "codigo" TEXT NOT NULL,
    "producto" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "presentacion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "costo" DECIMAL(12,2) NOT NULL,
    "precioPublico" DECIMAL(12,2) NOT NULL,
    "margenPct" DECIMAL(6,2) NOT NULL,
    "contenido" INTEGER,
    "unidad" TEXT,
    "pesoBrutoG" INTEGER,
    "pesoEstimado" BOOLEAN NOT NULL DEFAULT true,
    "fotoUrl" TEXT,
    "fotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nichos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "objetivos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clasificacionRevisada" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoProducto" NOT NULL DEFAULT 'ACTIVO',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "ocultoMotivo" TEXT,
    "gancho" BOOLEAN NOT NULL DEFAULT false,
    "porQueLoElegimos" TEXT,
    "vendidos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "costo" DECIMAL(12,2) NOT NULL,
    "precioPublico" DECIMAL(12,2) NOT NULL,
    "origen" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Combo" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCombo" NOT NULL DEFAULT 'COMBO',
    "nicho" TEXT,
    "descuentoPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "vigenteDesde" TIMESTAMP(3),
    "vigenteHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Combo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboItem" (
    "comboId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ComboItem_pkey" PRIMARY KEY ("comboId","codigo")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "compraMinima" DECIMAL(12,2) NOT NULL DEFAULT 200000,
    "margenMinimoPct" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "descuentoTransferenciaPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "comisionPagoPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "costoPackaging" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "envioGratisDesde" DECIMAL(12,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_categoria_idx" ON "Product"("categoria");

-- CreateIndex
CREATE INDEX "Product_marca_idx" ON "Product"("marca");

-- CreateIndex
CREATE INDEX "Product_visible_estado_margenPct_idx" ON "Product"("visible", "estado", "margenPct");

-- CreateIndex
CREATE INDEX "PriceHistory_codigo_fecha_idx" ON "PriceHistory"("codigo", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Combo_slug_key" ON "Combo"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_codigo_fkey" FOREIGN KEY ("codigo") REFERENCES "Product"("codigo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboItem" ADD CONSTRAINT "ComboItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboItem" ADD CONSTRAINT "ComboItem_codigo_fkey" FOREIGN KEY ("codigo") REFERENCES "Product"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

