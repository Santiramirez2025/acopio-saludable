import { test } from "node:test";
import assert from "node:assert/strict";
import { esPedidoWeb, grupoOrigen, resumirVentas, type FilaVenta } from "./ventas-resumen";

const fila = (o: Partial<FilaVenta> & { id: number }): FilaVenta => ({ estado: "PENDIENTE_PAGO", total: 1000, costoProductos: 500, costoEnvioReal: 100, comisionPago: 0, costoPackaging: 100, origen: null, telefono: "5493541000001", createdAt: new Date("2026-11-03T15:00:00Z"), pagadoAt: null, ...o });
const desde = new Date("2026-11-01T00:00:00Z");

test("ventas: creado y pagado son cortes separados; pagado de un pedido viejo cuenta como cobro y no como creado", () => {
  const viejo = fila({ id: 1, createdAt: new Date("2026-10-20T15:00:00Z"), pagadoAt: new Date("2026-11-02T15:00:00Z"), estado: "ENTREGADO", total: 2000 });
  const nuevo = fila({ id: 2, telefono: "5493541000002" });
  const r = resumirVentas([viejo, nuevo], [viejo, nuevo], desde, 3);
  assert.equal(r.creados.pedidos, 1);
  assert.equal(r.creados.facturado, 1000);
  assert.equal(r.pagados.pedidos, 1);
  assert.equal(r.pagados.cobrado, 2000);
  assert.equal(r.pagados.contribucion, 1300);
  assert.deepEqual(r.abiertosSinPago, { pedidos: 1, total: 1000 });
});

test("ventas: cancelados fuera, cliente que repite por los últimos 10 dígitos", () => {
  const a = fila({ id: 1, createdAt: new Date("2026-10-01T15:00:00Z"), telefono: "+54 9 3541 000001" });
  const b = fila({ id: 2, telefono: "93541000001" });
  const c = fila({ id: 3, telefono: "5493541000009", estado: "CANCELADO" });
  const r = resumirVentas([b, c], [a, b, c], desde, 3);
  assert.equal(r.creados.pedidos, 1);
  assert.equal(r.creados.cancelados, 1);
  assert.equal(r.creados.clientesNuevos, 0);
  assert.equal(r.creados.clientesRepiten, 1);
});

test("ventas: día en hora argentina y origen desconocido explícito", () => {
  const f = fila({ id: 1, createdAt: new Date("2026-11-04T01:00:00Z") });
  const r = resumirVentas([f], [f], desde, 5);
  assert.equal(r.porDia[0].fecha, "2026-11-03");
  assert.equal(r.porOrigen[0].origen, "desconocido");
  assert.equal(grupoOrigen("whatsapp · anuncio: Pedilo hoy"), "anuncio: Pedilo hoy");
  assert.equal(grupoOrigen("google (orgánico) · 2026-10-25"), "google (orgánico)");
});

test("embudo: solo el checkout de la web cuenta como compra web", () => {
  assert.equal(esPedidoWeb("web · directo"), true);
  assert.equal(esPedidoWeb("google (orgánico) · 2026-10-25"), true);
  assert.equal(esPedidoWeb("whatsapp"), false);
  assert.equal(esPedidoWeb("whatsapp · anuncio: Pedilo hoy"), false);
  assert.equal(esPedidoWeb(null), false);
});
