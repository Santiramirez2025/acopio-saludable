import { test } from "node:test";
import assert from "node:assert/strict";
import { queTraeMix } from "./mix-composicion";

test("un mix devuelve lo que dice su ficha", () => {
  assert.equal(queTraeMix("Mix Clásico con cajú", "Nueces, almendras, castañas de cajú, maní y pasas de uva."), "Nueces, almendras, castañas de cajú, maní y pasas de uva.");
});

test("lo que no es mix no agrega texto de ficha", () => {
  assert.equal(queTraeMix("Nuez Mariposa blanca light", "Elegida por su color."), null);
  assert.equal(queTraeMix("Remix de ejemplo", "Texto."), null);
});

test("sin ficha no inventa nada", () => {
  assert.equal(queTraeMix("Mix Tropical con girasol", null), null);
  assert.equal(queTraeMix("Mix Tropical con girasol", "   "), null);
});

test("corta las fichas largas", () => {
  const r = queTraeMix("Mix largo", "a".repeat(300));
  assert.equal(r?.length, 161);
  assert.ok(r?.endsWith("…"));
});
