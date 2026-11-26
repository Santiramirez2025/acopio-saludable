import { test } from "node:test";
import assert from "node:assert/strict";
import { hablaDelTrio, instruccionTrioSinStock, FRASE_DIA_TRIO } from "./trio-sin-stock";

test("trío sin stock: detecta el pedido del Trío por el cliente o por el anuncio (charlas del 26/11)", () => {
  assert.equal(hablaDelTrio(["Hola, quiero el Trío con las 3 recetas"]), true); // Susana, Ali, Sergio
  assert.equal(hablaDelTrio(["Hola, PRECIO", "3 kilos por $24.000"]), true); // Cris: lo dice el anuncio
  assert.equal(hablaDelTrio(["3 kilos, 3 recetas"]), true);
  assert.equal(hablaDelTrio(["¿tenés nuez?", null, undefined]), false);
  assert.equal(hablaDelTrio(["quiero 3 kilos de nuez"]), false);
  assert.equal(hablaDelTrio(["la alacena de frutos secos"]), false);
});

test("trío sin stock: mismo precio, sin día prometido, sin otro combo ni «lo anotamos»", () => {
  const t = instruccionTrioSinStock("$24.000");
  assert.match(t, /\$24\.000/);
  assert.ok(t.includes(FRASE_DIA_TRIO));
  assert.match(t, /NO prometas día/);
  assert.match(t, /No ofrezcas otro combo/);
  assert.match(t, /sin descuento/);
  assert.doesNotMatch(t, /Alacena/);
});
