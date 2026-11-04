import assert from "node:assert/strict";
import { test } from "node:test";
import { barraZona } from "./barra-zona";

test("barra de la zona: $15.000 va hacia el envío sin cargo, no hacia $60.000", () => {
  assert.deepEqual(barraZona(15000, 20000, 60000), { pct: 75, meta: 20000, falta: 5000, llego: false, faltaOtras: 45000 });
});

test("barra de la zona: desde $20.000 está completa aunque otras localidades pidan $60.000", () => {
  const b = barraZona(25000, 20000, 60000);
  assert.equal(b.pct, 100);
  assert.equal(b.llego, true);
  assert.equal(b.faltaOtras, 35000);
  assert.equal(barraZona(60000, 20000, 60000).faltaOtras, 0);
});
