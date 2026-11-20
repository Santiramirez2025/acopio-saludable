import { test } from "node:test";
import assert from "node:assert/strict";
import { montoSinSigno } from "./monto-sin-signo";

test("detecta el monto que perdió el $ y el primer dígito en bash", () => {
  assert.equal(montoSinSigno("Trío de frutos secos, 4.000 al recibir (o 2.000 si transferís)"), "4.000");
  assert.equal(montoSinSigno("El del video es el mix clásico con cajú (2.500 el kilo)"), "2.500");
});

test("deja pasar los montos con signo", () => {
  assert.equal(montoSinSigno("Sale $24.000, o $22.000 pagando antes por transferencia."), null);
  assert.equal(montoSinSigno("Envío $ 3.000 si no llega a $20.000"), null);
  assert.equal(montoSinSigno("Pedido AS-00141 para el lunes desde las 16"), null);
});

test("no confunde pesos de mercadería ni distancias", () => {
  assert.equal(montoSinSigno("Bolsa de 1.000 g y otra de 5.000 kg"), null);
  assert.equal(montoSinSigno("Queda a 2.500 metros"), null);
});
