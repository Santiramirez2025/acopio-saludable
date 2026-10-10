-- Segundo pack de imágenes propias: fotos de siete combos y de seis productos a granel.
UPDATE "Combo" SET "fotoUrl" = '/img/combos/alacena-sin-tacc.webp' WHERE "slug" = 'alacena-sin-tacc';
UPDATE "Combo" SET "fotoUrl" = '/img/combos/despensa-del-gym.webp' WHERE "slug" = 'despensa-del-gym';
UPDATE "Combo" SET "fotoUrl" = '/img/combos/especiero-completo.webp' WHERE "slug" = 'especiero-completo';
UPDATE "Combo" SET "fotoUrl" = '/img/combos/guisos-y-legumbres.webp' WHERE "slug" = 'guisos-y-legumbres';
UPDATE "Combo" SET "fotoUrl" = '/img/combos/mate-y-merienda.webp' WHERE "slug" = 'mate-y-merienda';
UPDATE "Combo" SET "fotoUrl" = '/img/combos/picada-y-snacks.webp' WHERE "slug" = 'picada-y-snacks';
UPDATE "Combo" SET "fotoUrl" = '/img/combos/reposteria-casera.webp' WHERE "slug" = 'reposteria-casera';
UPDATE "Product" SET "fotoUrl" = '/img/productos/almendras.webp', "fotos" = ARRAY['/img/productos/almendras.webp'] || array_remove("fotos", '/img/productos/almendras.webp') WHERE "codigo" IN ('1212121','700','702');
UPDATE "Product" SET "fotoUrl" = '/img/productos/castanas-caju.webp', "fotos" = ARRAY['/img/productos/castanas-caju.webp'] || array_remove("fotos", '/img/productos/castanas-caju.webp') WHERE "codigo" IN ('37555802','7961597','982106545','982106546');
UPDATE "Product" SET "fotoUrl" = '/img/productos/semilla-chia.webp', "fotos" = ARRAY['/img/productos/semilla-chia.webp'] || array_remove("fotos", '/img/productos/semilla-chia.webp') WHERE "codigo" IN ('00000011','522054');
UPDATE "Product" SET "fotoUrl" = '/img/productos/lentejas.webp', "fotos" = ARRAY['/img/productos/lentejas.webp'] || array_remove("fotos", '/img/productos/lentejas.webp') WHERE "codigo" IN ('2222147','333568','545415','7798168580703');
UPDATE "Product" SET "fotoUrl" = '/img/productos/nuez-mariposa.webp', "fotos" = ARRAY['/img/productos/nuez-mariposa.webp'] || array_remove("fotos", '/img/productos/nuez-mariposa.webp') WHERE "codigo" IN ('706','707','709');
UPDATE "Product" SET "fotoUrl" = '/img/productos/pasas-de-uva.webp', "fotos" = ARRAY['/img/productos/pasas-de-uva.webp'] || array_remove("fotos", '/img/productos/pasas-de-uva.webp') WHERE "codigo" IN ('536','570','571');
