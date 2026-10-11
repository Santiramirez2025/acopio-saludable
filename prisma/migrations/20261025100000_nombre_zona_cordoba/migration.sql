-- Nombre de la zona de entrega propia con cargo, para poder nombrarla en la ficha del producto,
-- el carrito, la pagina de envios y el asistente. Sin esto la zona existia solo en el checkout.
UPDATE "Setting"
SET "tablaEnvios" = jsonb_set("tablaEnvios"::jsonb, '{propiaPaga,nombre}', '"Córdoba capital"'::jsonb, true)
WHERE id = 1 AND "tablaEnvios"::jsonb ? 'propiaPaga';
