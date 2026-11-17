import { test } from "node:test";
import assert from "node:assert/strict";
import { baseTransferencia, esPrecioFijo, pctTransferenciaCombo } from "./precio-fijo";

test("el Trío es de precio único; el resto no", () => {
  assert.equal(esPrecioFijo("trio-de-frutos-secos"), true);
  assert.equal(esPrecioFijo("kit-semanal"), false);
  assert.equal(esPrecioFijo(null), false);
  assert.equal(pctTransferenciaCombo("trio-de-frutos-secos", 8), 0);
  assert.equal(pctTransferenciaCombo("kit-semanal", 8), 8);
});

test("la base del descuento deja afuera los renglones del Trío", () => {
  assert.equal(baseTransferencia([{ comboSlug: "trio-de-frutos-secos", importe: 24000 }, { comboSlug: null, importe: 10000 }]), 10000);
});
