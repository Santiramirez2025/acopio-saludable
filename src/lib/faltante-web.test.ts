import { test } from "node:test";
import assert from "node:assert/strict";
import { comboConFaltante, nombreFaltaHoy } from "./faltante-web";

const sinDatiles = [{ etiqueta: "Dátiles" }];

test("un producto con el faltante en el nombre no va a la vidriera", () => {
  assert.equal(nombreFaltaHoy("Dátiles con carozo", sinDatiles), true);
  assert.equal(nombreFaltaHoy("DATILES con carozo x 1 kg", sinDatiles), true);
  assert.equal(nombreFaltaHoy("Mix Clásico con cajú y girasol", sinDatiles), false);
  assert.equal(nombreFaltaHoy("Pasas de uva negras sin semilla", sinDatiles), false);
});

test("sin faltantes no se saca nada", () => {
  assert.equal(nombreFaltaHoy("Dátiles con carozo", []), false);
});

test("un combo con un producto que falta no se muestra; el Trío de la mañana sí", () => {
  const despensa = { items: [{ producto: { producto: "Avena arrollada fina" } }, { producto: { producto: "Dátiles con carozo" } }] };
  const manana = { items: [{ producto: { producto: "Mix Clásico con cajú y girasol" } }, { producto: { producto: "Avena arrollada fina" } }, { producto: { producto: "Granola tradicional" } }] };
  assert.equal(comboConFaltante(despensa, sinDatiles), true);
  assert.equal(comboConFaltante(manana, sinDatiles), false);
});
