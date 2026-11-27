import { test } from "node:test";
import assert from "node:assert/strict";
import { avisarCambioNoCargado, puedeSumarAOrden } from "./sumar-pedido";

test("se suma al mismo pedido solo si está sin cobrar", () => {
  assert.equal(puedeSumarAOrden({ estado: "PENDIENTE_PAGO", pagadoAt: null }), true);
  assert.equal(puedeSumarAOrden({ estado: "PENDIENTE_PAGO" }), true);
});

test("a un pedido cobrado no se le suma nada solo (saldría como pagado sin cobrarse)", () => {
  assert.equal(puedeSumarAOrden({ estado: "PAGADO", pagadoAt: new Date() }), false);
  assert.equal(puedeSumarAOrden({ estado: "PAGADO", pagadoAt: null }), false);
  // Estado raro: pendiente pero con pagadoAt (confirmado a mano) → tampoco.
  assert.equal(puedeSumarAOrden({ estado: "PENDIENTE_PAGO", pagadoAt: "2026-11-27T10:00:00Z" }), false);
});

test("pedido que ya salió, entregado o cancelado: nada", () => {
  for (const estado of ["ENVIADO", "ENTREGADO", "CANCELADO"]) assert.equal(puedeSumarAOrden({ estado, pagadoAt: null }), false);
});

test("el aviso a Santiago cubre pendiente y cobrado, no lo que ya salió", () => {
  assert.equal(avisarCambioNoCargado("PENDIENTE_PAGO"), true);
  assert.equal(avisarCambioNoCargado("PAGADO"), true);
  assert.equal(avisarCambioNoCargado("ENVIADO"), false);
  assert.equal(avisarCambioNoCargado(null), false);
});
