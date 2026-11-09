import { test } from "node:test";
import assert from "node:assert/strict";
import { textosPorDefecto } from "./recompra-reglas";

// Orden de Laura 9/11 (propuesta de Nico): sin almendra asegurada, el carrito por defecto son los 3 kilos seguros.
test("vendedor: con espera activa, el carrito por defecto son los 3 kilos y no la Alacena ni la almendra", () => {
  const t = textosPorDefecto(true);
  assert.match(t.carrito, /dátiles con carozo, mix de semillas y pasas/);
  assert.doesNotMatch(t.gama, /almendra|caj[uú]/);
  assert.doesNotMatch(t.caro, /caj[uú]/);
  assert.doesNotMatch(t.corto, /Alacena/);
});

test("vendedor: con el interruptor apagado vuelve la Alacena", () => {
  const t = textosPorDefecto(false);
  assert.match(t.carrito, /Alacena/);
  assert.match(t.gama, /almendra/);
});
