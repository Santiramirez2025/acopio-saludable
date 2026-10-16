-- El pedido que el vendedor dejó armado en la charla (el camino del carrito), para cotizar
-- el envío cuando la persona dice su zona y mostrarle recién ahí los botones para pagar.
ALTER TABLE "WhatsappConversacion" ADD COLUMN "pedido" TEXT;
