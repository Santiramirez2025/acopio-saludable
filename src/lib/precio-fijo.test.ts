import { test } from "node:test";
import assert from "node:assert/strict";
import { baseTransferencia, esPrecioFijo, pctTransferenciaCombo } from "./precio-fijo";

test("el Trío es de precio único: $24.000 con cualquier medio de pago (21/11)", () => {
  assert.equal(esPrecioFijo("trio-de-frutos-secos"), true);
  assert.equal(esPrecioFijo("kit-semanal"), false);
  assert.equal(esPrecioFijo(null), false);
  assert.equal(pctTransferenciaCombo("trio-de-frutos-secos", 8), 0);
  assert.equal(pctTransferenciaCombo("kit-semanal", 8), 8);
});

test("la base del descuento deja afuera al Trío", () => {
  assert.equal(baseTransferencia([{ comboSlug: "trio-de-frutos-secos", importe: 24000 }, { comboSlug: null, importe: 10000 }]), 10000);
});

test("la marca Marcilli no aparece en el catálogo (Santiago, 17/11)", async () => {
  const { PRODUCTOS_PROVEEDORES } = await import("./catalogo-proveedores");
  assert.doesNotMatch(JSON.stringify(PRODUCTOS_PROVEEDORES), /marcilli/i);
});

test("un horario no es una dirección (AS-114, 17/11)", async () => {
  const { tieneDireccion } = await import("./whatsapp-interactivo");
  for (const t of ["Seguro estoy 18 :30", "Estoy hasta las 13", "a las 19 hs", "despues de las 18:30 hs"]) assert.equal(tieneDireccion(t), false, t);
  for (const t of ["Atahualpa 513 barrio general Belgrano", "Nicaragua 90", "9 de Julio 50", "Las Heras 485 estoy hasta las 13"]) assert.equal(tieneDireccion(t), true, t);
});
