import assert from "node:assert/strict";
import { test } from "node:test";
import { datosCompletos, embudoCheckout, EVENTOS_CHECKOUT } from "./embudo-checkout";

const s = (...e: string[]) => new Set(e);

test("embudo del checkout: cuenta por sesión y dice en qué paso se va cada una", () => {
  const r = embudoCheckout([
    s("pagina", "agregar"), // nunca entró al checkout: no cuenta
    s("iniciar_compra"), // entró y no completó los datos
    s("iniciar_compra", "checkout_datos"), // se fue antes de ver el envío
    s("iniciar_compra", "checkout_datos", "checkout_bajo_minimo"), // CP de afuera, no llega al mínimo
    s("iniciar_compra", "checkout_datos", "checkout_envio"), // vio el envío y no confirmó
    s("iniciar_compra", "checkout_datos", "checkout_envio", "checkout_confirmar", "checkout_error_pedido"),
    s("iniciar_compra", "checkout_datos", "checkout_envio", "checkout_confirmar", "checkout_pedido", "checkout_a_mp"),
    s("iniciar_compra", "checkout_datos", "checkout_envio", "checkout_confirmar", "checkout_pedido", "checkout_transferencia"),
  ]);
  assert.equal(r.entraron, 7);
  assert.equal(r.completaronDatos, 6);
  assert.equal(r.vieronEnvio, 4);
  assert.equal(r.tocaronConfirmar, 3);
  assert.equal(r.pedidoCreado, 2);
  assert.equal(r.fueronAMercadoPago, 1);
  assert.equal(r.eligieronTransferencia, 1);
  assert.equal(r.bajoMinimo, 1);
  assert.equal(r.errorAlConfirmar, 1);
  assert.deepEqual(r.seVanEn.map((x) => x.sesiones), [1, 2, 1, 1]);
  // Toda sesión que entró y no creó el pedido aparece en un solo paso.
  assert.equal(r.seVanEn.reduce((a, x) => a + x.sesiones, 0), r.entraron - r.pedidoCreado);
});

test("embudo del checkout: si se pierde el evento de un paso, el siguiente igual cuenta como llegado", () => {
  const r = embudoCheckout([s("iniciar_compra", "checkout_envio", "checkout_confirmar")]);
  assert.equal(r.completaronDatos, 1);
  assert.equal(r.vieronEnvio, 1);
  assert.deepEqual(r.seVanEn.map((x) => x.sesiones), [0, 0, 0, 1]);
});

test("embudo del checkout: sin sesiones, todo en cero", () => {
  const r = embudoCheckout([]);
  assert.equal(r.entraron, 0);
  assert.deepEqual(r.seVanEn.map((x) => x.sesiones), [0, 0, 0, 0]);
});

test("datos completos: nombre, email válido y WhatsApp de 8 dígitos o más", () => {
  assert.equal(datosCompletos("Ana Pérez", "ana@mail.com", "3541 51-9630"), true);
  assert.equal(datosCompletos("An", "ana@mail.com", "3541519630"), false);
  assert.equal(datosCompletos("Ana Pérez", "ana@mail", "3541519630"), false);
  assert.equal(datosCompletos("Ana Pérez", "ana@mail.com", "1234"), false);
});

test("los eventos del checkout son nombres que acepta /api/medicion (letras y guion bajo)", () => {
  for (const e of EVENTOS_CHECKOUT) assert.match(e, /^checkout_[a-z_]+$/);
});
