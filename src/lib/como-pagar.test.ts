import { test } from "node:test";
import assert from "node:assert/strict";
import { textoComoPagar } from "./como-pagar";

test("¿Cómo pago?: en la zona se paga al recibir; por correo, por adelantado", () => {
  const zona = textoComoPagar();
  assert.match(zona, /pagás al recibir/);
  assert.match(zona, /por adelantado/);
  assert.doesNotMatch(zona, /acreditado/);
  const correo = textoComoPagar({ reparto: false });
  assert.match(correo, /^Para envíos por correo/);
});

test("¿Cómo pago?: sin descuentos ni promesas que contradigan el precio único del Trío", () => {
  for (const t of [textoComoPagar(), textoComoPagar({ reparto: false })]) {
    assert.doesNotMatch(t, /descuento|22\.000|antes de pagar/i);
  }
});
