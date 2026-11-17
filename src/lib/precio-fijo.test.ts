import { test } from "node:test";
import assert from "node:assert/strict";
import { baseTransferencia, esPrecioFijo, pctTransferenciaCombo } from "./precio-fijo";

test("precio único: hoy ningún combo (el Trío volvió a $22.000 por transferencia)", () => {
  assert.equal(esPrecioFijo("trio-de-frutos-secos"), false);
  assert.equal(esPrecioFijo("kit-semanal"), false);
  assert.equal(esPrecioFijo(null), false);
  assert.equal(pctTransferenciaCombo("trio-de-frutos-secos", 8), 8);
  assert.equal(pctTransferenciaCombo("kit-semanal", 8), 8);
});

test("la base del descuento suma todos los renglones cuando no hay combos de precio único", () => {
  assert.equal(baseTransferencia([{ comboSlug: "trio-de-frutos-secos", importe: 24000 }, { comboSlug: null, importe: 10000 }]), 34000);
});

test("la marca Marcilli no aparece en el catálogo (Santiago, 17/11)", async () => {
  const { PRODUCTOS_PROVEEDORES } = await import("./catalogo-proveedores");
  assert.doesNotMatch(JSON.stringify(PRODUCTOS_PROVEEDORES), /marcilli/i);
});
