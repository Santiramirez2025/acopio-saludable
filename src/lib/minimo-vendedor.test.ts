import { test } from "node:test";
import assert from "node:assert/strict";
import { reglaMinimo } from "./minimo-vendedor";

test("con reparto propio, separa el mínimo de la zona y no lo dice antes de saber la ciudad", () => {
  const r = reglaMinimo("$60.000", "$20.000");
  assert.match(r, /Carlos Paz.*\$20\.000/);
  assert.match(r, /resto del país, \$60\.000/);
  assert.match(r, /antes de saber su ciudad/);
  assert.match(r, /Nunca le digas \$60\.000 a alguien de Carlos Paz/);
});

test("sin reparto propio, un solo mínimo", () => {
  const r = reglaMinimo("$60.000", null);
  assert.match(r, /La compra mínima es \$60\.000/);
  assert.doesNotMatch(r, /Carlos Paz/);
});
