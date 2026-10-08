-- La compra mínima baja a $ 60.000 para que también puedan comprar familias.
-- Solo se actualiza si sigue en el valor original: no pisa un cambio hecho desde el panel.
ALTER TABLE "Setting" ALTER COLUMN "compraMinima" SET DEFAULT 60000;
UPDATE "Setting" SET "compraMinima" = 60000 WHERE "compraMinima" = 200000;
