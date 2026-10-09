-- Precio de lista = precio base + recargo que cubre la comisión del medio de pago.
-- El descuento por transferencia devuelve ese recargo: quien transfiere paga el precio base.
ALTER TABLE "Setting" ADD COLUMN "recargoPrecioPct" DECIMAL(5,2) NOT NULL DEFAULT 0;
UPDATE "Setting" SET "recargoPrecioPct" = 8, "descuentoTransferenciaPct" = 8 WHERE "descuentoTransferenciaPct" IN (0, 5);
UPDATE "Setting" SET "comisionPagoPct" = 7.61 WHERE "comisionPagoPct" = 0;
