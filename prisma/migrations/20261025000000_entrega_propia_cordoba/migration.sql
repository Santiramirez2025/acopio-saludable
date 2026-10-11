-- Entrega propia con cargo a Cordoba capital: $15.000, la lleva Santiago.
--
-- Por que: Andreani cobra tarifa plana nacional, o sea lo mismo por 36 km que por 700.
-- Un bulto de 10 kg a Cordoba capital le cuesta $34.400 mas seguro. Llevarlo el, con la
-- Kangoo, sale una fraccion de eso y el margen queda entero.
--
-- 5000-5025 cubre Cordoba capital. Si quiere sumar Villa Allende (5105), Saldan (5103),
-- La Calera (5151) o Unquillo (5107), se agregan en Panel > Envios sin tocar codigo.
--
-- El costo del viaje queda en 0 hasta que cargue lo que gasta de nafta y tiempo: el
-- cliente no lo ve, solo sirve para que el margen neto del panel sea real.

UPDATE "Setting"
SET "tablaEnvios" = jsonb_set(
      "tablaEnvios"::jsonb,
      '{propiaPaga}',
      '{"cps": "5000-5025", "precio": 15000, "costo": 0, "plazo": "24 a 48 hs hábiles"}'::jsonb,
      true
    )
WHERE id = 1;
