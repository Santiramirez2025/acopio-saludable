-- Los combos pasan a tener 5% de descuento sobre la suma de sus productos (solo los que estaban sin descuento).
UPDATE "Combo" SET "descuentoPct" = 5 WHERE "tipo" = 'COMBO' AND "descuentoPct" = 0;
