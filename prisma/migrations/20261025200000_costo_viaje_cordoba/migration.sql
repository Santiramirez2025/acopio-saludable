-- Costo del viaje a Cordoba capital, para que el margen neto del panel sea real.
--
-- Como sale el numero:
--   Carlos Paz <-> Cordoba capital, ida y vuelta: 80 km
--   Kangoo naftera con carga: 9,5 L/100 km  ->  7,6 litros
--   Nafta super YPF Cordoba, 29-sep-2026: $2.125 el litro  ->  $16.150 de combustible
--   Desgaste (cubiertas, aceite, service prorrateado), 40% del combustible: $6.460
--   Costo del viaje: $22.610
--
-- Se carga $11.305, que es el viaje dividido en DOS entregas. Con una sola entrega por
-- viaje el costo es $22.610 y cobrando $15.000 se pierde plata: el negocio de llevarlo
-- uno mismo aparece recien cuando se agrupan dos o mas entregas en el mismo viaje.
--
-- Si tiene la Kangoo diesel el costo baja bastante; se corrige en Panel > Envios.

UPDATE "Setting"
SET "tablaEnvios" = jsonb_set("tablaEnvios"::jsonb, '{propiaPaga,costo}', '11305'::jsonb, true)
WHERE id = 1 AND "tablaEnvios"::jsonb ? 'propiaPaga';
