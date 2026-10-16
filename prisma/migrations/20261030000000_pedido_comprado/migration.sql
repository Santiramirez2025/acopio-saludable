-- Cuándo se le compró a Distrimay lo de este pedido: así sale de la lista de compra y no se repite,
-- aunque el pedido todavía no esté pago (transferencia sin confirmar o pago al recibir).
ALTER TABLE "Order" ADD COLUMN "compradoAt" TIMESTAMPTZ(6);
