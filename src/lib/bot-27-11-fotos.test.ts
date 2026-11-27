import { test } from "node:test";
import assert from "node:assert/strict";
import { fotosOportunas, muestraFaltante, VIDEO_DATILES_TRIO } from "./galeria";
import { PLAZO_CORREO } from "./envio-zona";

const SIN_DATILES = [{ etiqueta: "Dátiles" }];

test("27/11 Noelia AS-190: sin dátiles no sale ninguna foto ni video que los muestre", () => {
  assert.ok(muestraFaltante({ url: "/img/galeria/combo-trio-de-frutos-secos.jpg", pie: "Trío de frutos secos: mix con cajú, dátiles y pasas · {combo:trio-de-frutos-secos}" }, SIN_DATILES));
  assert.ok(muestraFaltante({ url: "/img/galeria/combo-despensa-4-kilos.jpg", pie: "Despensa de 4 kilos · {combo:despensa-4-kilos}" }, SIN_DATILES));
  assert.ok(muestraFaltante(VIDEO_DATILES_TRIO, SIN_DATILES));
  assert.ok(muestraFaltante({ url: "/img/galeria/combo-pan-dulce-casero.jpg", pie: "Pan dulce casero" }, SIN_DATILES));
  assert.ok(!muestraFaltante({ url: "/img/galeria/combo-trio-de-la-manana.jpg", pie: "Trío de la mañana: mix con cajú, avena y granola · {combo:trio-de-la-manana}" }, SIN_DATILES));
  assert.ok(!muestraFaltante({ url: "/img/galeria/combo-despensa-4-kilos.jpg", pie: "Despensa de 4 kilos · {combo:despensa-4-kilos}" }, []));
});

test("27/11: con SIN_STOCK_HOY = dátiles, «el más pedido» y las opciones no muestran combos con dátiles", () => {
  const precios = fotosOportunas({ faltantes: SIN_DATILES, entrante: "Hola, precios por kilo?", respuesta: "Mix con cajú y girasol $10.500, pasas $5.900", historial: [] });
  assert.ok(precios.every((f) => !muestraFaltante(f, SIN_DATILES)), JSON.stringify(precios));
  const opciones = fotosOportunas({ faltantes: SIN_DATILES, entrante: "qué otros combos tenés?", respuesta: "Tenemos la Despensa de 4 kilos, la Alacena y el Trío de la mañana", historial: [] });
  assert.ok(opciones.length > 0);
  assert.ok(opciones.every((f) => !muestraFaltante(f, SIN_DATILES)), JSON.stringify(opciones));
  const despensa = fotosOportunas({ faltantes: SIN_DATILES, entrante: "quiero la despensa de 4 kilos", respuesta: "La Despensa de 4 kilos está $28.000", historial: [] });
  assert.ok(despensa.every((f) => !muestraFaltante(f, SIN_DATILES)), JSON.stringify(despensa));
});

test("27/11 Rosa, Carlos, Mab: la lista de precios o la explicación del mix no llevan la foto de la nuez", () => {
  const lista = fotosOportunas({
    entrante: "me pasas los precios del mix?",
    respuesta: "Mix con cajú y girasol $10.500 el kilo (trae maní, nuez, almendra, cajú y pasas). Nuez mariposa $24.500, pasas $5.900.",
    historial: [{ de: "acopio", texto: "Hola!" }],
  });
  assert.ok(lista.every((f) => !/nuez/i.test(f.pie)), JSON.stringify(lista));
  const nuez = fotosOportunas({ faltantes: SIN_DATILES, entrante: "cuánto la nuez?", respuesta: "La nuez mariposa está $24.500 el kilo", historial: [{ de: "acopio", texto: "Hola!" }] });
  assert.ok(nuez.some((f) => /nuez/i.test(f.pie)), JSON.stringify(nuez));
  const soloUno = fotosOportunas({ faltantes: SIN_DATILES, entrante: "y eso?", respuesta: "Las pasas de uva están $5.900 el kilo", historial: [{ de: "acopio", texto: "Hola!" }] });
  assert.ok(soloUno.some((f) => /pasas/i.test(f.pie)), JSON.stringify(soloUno));
});

test("27/11 Cristina y Gladis: un solo texto de plazo del correo, con despacho y correo juntos", () => {
  assert.match(PLAZO_CORREO, /24 a 48 h hábiles y el correo tarda/);
  assert.match(PLAZO_CORREO, /Nunca digas «24 a 48 h» solo/);
});
