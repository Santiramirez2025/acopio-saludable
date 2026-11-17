import assert from "node:assert/strict";
import { test } from "node:test";
import { costoDePresentacion } from "./listas-presentacion";

test("presentación chica: el kilo de la lista se lleva a los gramos", () => {
  assert.equal(costoDePresentacion(3842, 1650, 500), 1921);
  assert.equal(costoDePresentacion(4000, 1000, 250), 1000);
});

test("bolsa cerrada: el kilo de la lista se multiplica por los kilos (17/11)", () => {
  assert.equal(costoDePresentacion(13000, 130000, 10000), 130000);
  assert.equal(costoDePresentacion(17487.53, 88647, 5000), 87438);
  assert.equal(costoDePresentacion(2618.46, 65462, 25000), 65462);
});

test("si la lista ya trae el precio de la presentación, se usa tal cual", () => {
  assert.equal(costoDePresentacion(130000, 128000, 10000), 130000);
  assert.equal(costoDePresentacion(1900, 1850, 500), 1900);
  assert.equal(costoDePresentacion(3842, 3164, 1000), 3842);
});
