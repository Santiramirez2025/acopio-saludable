-- Combos navideños: se cambian los productos que hoy no se publican por los equivalentes de La Granja y LG.
DELETE FROM "ComboItem" WHERE "comboId" IN (SELECT "id" FROM "Combo" WHERE "slug" IN ('pan-dulce-casero', 'mesa-navidena', 'regalo-navideno'));
INSERT INTO "ComboItem" ("comboId", "codigo", "cantidad")
SELECT c."id", v."codigo", 1 FROM "Combo" c
JOIN (VALUES
  ('pan-dulce-casero', 'TG-NUEZ'), ('pan-dulce-casero', 'TG-PASAS'), ('pan-dulce-casero', '800000000154'),
  ('mesa-navidena', 'TG-MIXC'), ('mesa-navidena', '234152'), ('mesa-navidena', 'LG-DATIL-500'), ('mesa-navidena', '800000000161'), ('mesa-navidena', '982106546'), ('mesa-navidena', '702'),
  ('regalo-navideno', 'TG-MIXTSM'), ('regalo-navideno', '982106546'), ('regalo-navideno', 'LG-DATIL-500')
) AS v("slug", "codigo") ON v."slug" = c."slug"
WHERE EXISTS (SELECT 1 FROM "Product" p WHERE p."codigo" = v."codigo")
ON CONFLICT DO NOTHING;
-- Navidad arranca ya.
UPDATE "Combo" SET "vigenteDesde" = '2026-10-20T00:00:00-03:00' WHERE "slug" IN ('pan-dulce-casero', 'mesa-navidena', 'regalo-navideno');
