import { test } from "node:test";
import assert from "node:assert/strict";
import { campaniaDeOrigen, lineaOrigen, campaniaEnMensajes } from "./origen-web";

test("saca la campaña del primer origen con utm", () => {
  assert.equal(campaniaDeOrigen("consultorio / caon · 2026-11-11"), "consultorio / caon");
  assert.equal(campaniaDeOrigen("consultorio / caon · 2026-11-11 → instagram · 2026-11-12"), "consultorio / caon");
  assert.equal(campaniaDeOrigen("ig / historia / pan-dulce · 2026-11-10"), "ig / historia / pan-dulce");
});

test("sin utm no hay campaña", () => {
  for (const o of ["web · directo", "instagram · 2026-11-11", "google (orgánico) · 2026-11-11", "", null, undefined]) assert.equal(campaniaDeOrigen(o), null);
  assert.equal(lineaOrigen("web · directo"), "");
});

test("ida y vuelta: lo que manda la web lo recupera el pedido", () => {
  const msg = `Hola! Quiero hacer este pedido de la web:\n• 1 × Nuez: $ 20.500\nTotal: $ 20.500${lineaOrigen("consultorio / caon · 2026-11-11")}`;
  assert.equal(campaniaEnMensajes(["Mi dirección es Belgrano 100", msg]), "consultorio / caon");
});

test("un mensaje sin marca o con texto suelto no inventa campaña", () => {
  assert.equal(campaniaEnMensajes(["Hola, vengo de Instagram", "Vengo de: mi casa"]), null);
});
