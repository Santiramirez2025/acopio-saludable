-- Tercer pack de imágenes propias. Además, todo producto con imagen propia deja de mostrar la foto del proveedor.
UPDATE "Product" SET "fotoUrl" = '/img/productos/citrato-magnesio.webp', "fotos" = ARRAY['/img/productos/citrato-magnesio.webp','/img/productos/citrato-magnesio-2.webp'] WHERE "codigo" IN ('3622','363626');
UPDATE "Product" SET "fotoUrl" = '/img/productos/barras-proteicas-xl-olympic.webp', "fotos" = ARRAY['/img/productos/barras-proteicas-xl-olympic.webp'] WHERE "codigo" = '151516121';
UPDATE "Product" SET "fotoUrl" = '/img/productos/sal-marina-fina-dicomere.webp', "fotos" = ARRAY['/img/productos/sal-marina-fina-dicomere.webp','/img/productos/sal-marina-fina-dicomere-2.webp'] WHERE "codigo" = '1213131';
UPDATE "Product" SET "fotoUrl" = '/img/productos/quinoa-pop-bolson.webp', "fotos" = ARRAY['/img/productos/quinoa-pop-bolson.webp'] WHERE "codigo" = '1231212';
UPDATE "Product" SET "fotoUrl" = '/img/productos/dulce-caroyense.webp', "fotos" = ARRAY['/img/productos/dulce-caroyense.webp'] WHERE "codigo" = '7794759000635';
UPDATE "Product" SET "fotoUrl" = '/img/productos/dulce-caroyense.webp', "fotos" = ARRAY['/img/productos/dulce-caroyense.webp','/img/productos/dulce-membrillo-caroyense-2.webp'] WHERE "codigo" = '7794759001298';
-- Limpieza general: si hay alguna imagen propia, quedan solo las propias y la primera pasa a ser la principal.
UPDATE "Product" p SET "fotos" = s.propias, "fotoUrl" = s.propias[1]
FROM (SELECT "codigo", ARRAY(SELECT f FROM unnest("fotos") WITH ORDINALITY AS t(f, n) WHERE f LIKE '/img/%' ORDER BY n) AS propias FROM "Product") s
WHERE p."codigo" = s."codigo" AND cardinality(s.propias) > 0;
