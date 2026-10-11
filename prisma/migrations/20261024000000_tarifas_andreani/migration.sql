-- Tarifas reales de Andreani, en lugar de la estimacion de Correo Argentino que habia hasta ahora.
--
-- De donde salen los numeros, para poder rehacerlos:
--  1. Cotizador publico de Andreani, origen Villa Carlos Paz (5152) a CABA (1425),
--     caja cubica de ~3 litros por kilo: 1, 5, 10, 15, 20 y 25 kg.
--  2. La cuenta Emprendedores y PyMEs paga menos que el publico. Dos cotizaciones
--     pareadas, misma caja y misma ruta, dan el factor: 10 kg 0,8915 y 25 kg 0,8958,
--     se usa el promedio 0,8936 (dispersion 0,48%).
--  3. Andreani cobra TARIFA PLANA NACIONAL por peso: Cordoba capital sale igual que CABA,
--     peso por peso. Por eso cordoba, centro y norte llevan la misma fila.
--  4. La Patagonia si es mas cara: Ushuaia 10 kg costo 1,4535 veces lo nacional en la
--     cuenta real. Esa es la fila de patagonia.
--  5. Todo redondeado hacia arriba con 0,6% de resguardo: con +-0,25% de error de
--     calibracion, preferimos cobrar de mas que poner plata nosotros.
--
-- El seguro NO esta en estos numeros: Andreani lo cobra como 1,21% del valor declarado,
-- asi que viaja en seguroPct y se calcula sobre el precio del pedido.
--
-- La comision de pago pasa de 6% a 8%: en la primera venta real Mercado Pago cobro
-- 7,99% ($6.082,11 sobre $76.153). Con 6% el margen neto del panel mentia por $1.500.

UPDATE "Setting"
SET "tablaEnvios" = '{
  "tramosKg": [1, 5, 10, 15, 20, 25],
  "zonas": {
    "cordoba":   { "sucursal": [9250, 23750, 34400, 43600, 69750, 69750], "domicilio": [11400, 24050, 34750, 43900, 70700, 70700], "plazo": "2 a 5 días hábiles" },
    "centro":    { "sucursal": [9250, 23750, 34400, 43600, 69750, 69750], "domicilio": [11400, 24050, 34750, 43900, 70700, 70700], "plazo": "2 a 5 días hábiles" },
    "norte":     { "sucursal": [9250, 23750, 34400, 43600, 69750, 69750], "domicilio": [11400, 24050, 34750, 43900, 70700, 70700], "plazo": "3 a 7 días hábiles" },
    "patagonia": { "sucursal": [13450, 34500, 50000, 63350, 101350, 101350], "domicilio": [16550, 34950, 50500, 63850, 102750, 102750], "plazo": "3 a 7 días hábiles" }
  },
  "seguroPct": 1.21,
  "correo": "andreani"
}'::jsonb,
    "tablaEnviosRevisada" = true,
    "comisionPagoPct" = 8
WHERE id = 1;
