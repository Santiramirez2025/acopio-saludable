import { test } from "node:test";
import assert from "node:assert/strict";
import { REGALO_TOPE_DEFECTO, REGALO_TOPE_MAX, topeRegalo } from "./regalo-tope";

test("regalo: sin cantidad o con basura, la tanda es la de defecto", () => {
  for (const v of [undefined, null, "", "abc", 0, -5, NaN, {}, []]) assert.equal(topeRegalo(v), REGALO_TOPE_DEFECTO);
});

test("regalo: nunca más del máximo por llamada, aunque pidan toda la base", () => {
  assert.equal(topeRegalo(10_000), REGALO_TOPE_MAX);
  assert.equal(topeRegalo(Infinity), REGALO_TOPE_DEFECTO);
  assert.equal(topeRegalo("999"), REGALO_TOPE_MAX);
});

test("regalo: una cantidad válida se respeta (entera)", () => {
  assert.equal(topeRegalo(5), 5);
  assert.equal(topeRegalo("12"), 12);
  assert.equal(topeRegalo(7.9), 7);
});
