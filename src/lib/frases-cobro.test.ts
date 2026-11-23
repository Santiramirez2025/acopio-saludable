import test from "node:test";
import assert from "node:assert/strict";
import { sinFrasesDeCobroProhibidas } from "./frases-cobro";
import { envioPedidoZonaPropia } from "./envio-zona";

test("frases de cobro: «ver antes de pagar» y «lo ves en tu puerta» no salen", () => {
  assert.equal(sinFrasesDeCobroProhibidas("¿Querés que te pase el detalle para ver antes de pagar?"), "¿Querés que te pase el detalle?");
  assert.equal(sinFrasesDeCobroProhibidas("Te lo llevamos y lo ves antes de pagarlo. ¿Te lo dejo listo?"), "Te lo llevamos. ¿Te lo dejo listo?");
  assert.equal(sinFrasesDeCobroProhibidas("Pagás al recibir, lo ves en tu puerta."), "Pagás al recibir.");
  const ok = "El costo se ve en el carrito con el código postal. ¿De qué barrio sos?";
  assert.equal(sinFrasesDeCobroProhibidas(ok), ok);
  assert.equal(sinFrasesDeCobroProhibidas("Trío $22.000\nDátiles $5.500"), "Trío $22.000\nDátiles $5.500");
});

test("pedido del chat en la zona: la vecina paga su cargo; Carlos Paz, $3.000 siempre desde el 23/11 (AS-127, AS-123)", () => {
  const cfg = { compraMinima: 60000, compraMinimaPropia: 20000, envioBajoMinimo: 3000, entregaPropiaActiva: true };
  assert.equal(envioPedidoZonaPropia(cfg as never, "Solares de Icho Cruz", 24000), 3000);
  assert.equal(envioPedidoZonaPropia(cfg as never, "Bialet Massé", 22000), 3000);
  assert.equal(envioPedidoZonaPropia(cfg as never, "Tanti", 61000), 4000);
  assert.equal(envioPedidoZonaPropia(cfg as never, "Villa Carlos Paz", 24000), 3000);
  assert.equal(envioPedidoZonaPropia(cfg as never, "Villa Carlos Paz", 12000), 3000);
});
