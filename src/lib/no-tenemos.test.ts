import { test } from "node:test";
import assert from "node:assert/strict";
import { contarNoTenemos, productosQueNoHay } from "./no-tenemos";

test("no tenemos: saca el producto en las dos formas de decirlo", () => {
  assert.deepEqual(productosQueNoHay("Semillas de zapallo no tengo. ¿Para qué las usabas?"), ["semillas de zapallo"]);
  assert.deepEqual(productosQueNoHay("Hoy no tenemos semillas de zapallo, perdón."), ["semillas de zapallo"]);
  assert.deepEqual(productosQueNoHay("Por ahora no tenemos nueces de Brasil en el catálogo."), ["nuez de brasil"]);
  assert.deepEqual(productosQueNoHay("Hoy no tenemos maíz ni pepitas, así que no te puedo asegurar ese mix."), ["maíz", "pepitas"]);
  assert.deepEqual(productosQueNoHay("Dátiles de Israel no tenemos, Mary."), ["dátiles de israel"]);
});

test("no tenemos: local, envío, apuro o compra mínima no son productos", () => {
  for (const t of [
    "Angela, no tenemos local a la calle: trabajamos online.",
    "Dale, no hay apuro. Cuando quieras armamos el pedido.",
    "Dale, no hay problema.",
    "Envío gratis por monto no tenemos.",
    "Trabajamos sin local a la calle, así que no tenemos un lugar para ver la mercadería.",
    "Pero no tenemos local para retirar: trabajamos sin local.",
    "Los domingos no hay reparto.",
    "No tengo confirmados todos sus ingredientes.",
  ]) assert.deepEqual(productosQueNoHay(t), [], t);
});

test("no tenemos: cuenta charlas distintas y guarda la pregunta del cliente", () => {
  const r = contarNoTenemos([
    [{ de: "cliente", texto: "¿Tenés semilla de zapallo?" }, { de: "vendedor", texto: "Semillas de zapallo no tengo. ¿Para qué las usabas?" }, { de: "vendedor", texto: "Hoy no tenemos semillas de zapallo." }],
    [{ de: "cliente", texto: "zapallo hay?" }, { de: "persona", texto: "Semillas de zapallo no tenemos." }],
    [{ de: "cliente", texto: "Y pistacho?" }, { de: "vendedor", texto: "Pistacho no tenemos por ahora." }],
    [{ de: "cliente", texto: "Semillas de zapallo no tengo en casa" }],
  ]);
  assert.deepEqual(r, [
    { producto: "semillas de zapallo", veces: 2, ejemplo: "¿Tenés semilla de zapallo?" },
    { producto: "pistacho", veces: 1, ejemplo: "Y pistacho?" },
  ]);
});
