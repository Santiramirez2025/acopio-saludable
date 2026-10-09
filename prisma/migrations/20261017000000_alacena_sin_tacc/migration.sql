-- Las galletitas de vainilla Angiola fueron recodificadas por el proveedor: se reemplazan por harina de avena sin gluten.
UPDATE "ComboItem" SET "codigo" = '7793323024992'
WHERE "codigo" = '7798294150190' AND "comboId" IN (SELECT "id" FROM "Combo" WHERE "slug" = 'alacena-sin-tacc')
  AND EXISTS (SELECT 1 FROM "Product" WHERE "codigo" = '7793323024992');
