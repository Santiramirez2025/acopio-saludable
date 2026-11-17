import { test } from "node:test";
import assert from "node:assert/strict";
import { claves, palabrasDeRespaldo } from "./lista-palabras";

test("Norma 17/11: la prosa alrededor no tapa el producto", () => {
  assert.deepEqual(palabrasDeRespaldo("Yo compro todos los años ….nueces"), ["nuez"]);
  assert.deepEqual(palabrasDeRespaldo("Cerezas(hago budines para la flia.)"), ["cereza"]);
});

test("un renglón limpio queda igual", () => {
  assert.deepEqual(palabrasDeRespaldo("castañas"), ["castana"]);
  assert.deepEqual(palabrasDeRespaldo("almendras y avellanas"), ["almendra", "avellana"]);
});

test("claves sigue igual: nueces → nuez y sin vacías", () => {
  assert.deepEqual(claves("Nuez Mariposa blanca light x 1 kg"), ["nuez", "mariposa", "blanca", "light"]);
  assert.ok(claves("1kg. Nueces").includes("nuez"));
});
