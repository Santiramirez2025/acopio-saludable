// Regla de seguridad: una captura de comprobante NUNCA confirma un pago. Solo queda anotada; el pago lo
// registra Santiago cuando ve la acreditación en su cuenta. Estos tests protegen esa regla.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decidirComprobante, debeDelPedido, detalleComprobante, notaComprobante, type Comprobante } from "./comprobante";

const abierto = (id: number, total: number, notas: string | null = null) => ({ id, estado: "PENDIENTE_PAGO", total, notas, pagadoAt: null as Date | null });
const comp = (monto: number | null, extra: Partial<Comprobante> = {}): Comprobante => ({ esComprobante: true, monto, fecha: "30/10/2026 09:12", destinatario: "Santiago A. R.", operacion: "123456", ...extra });

test("comprobante que coincide: se anota como SIN VERIFICAR y no cambia estado ni pago", () => {
  const pedidos = [abierto(36, 74700)];
  const d = decidirComprobante(pedidos, comp(74700));
  assert.equal(d.tipo, "coincide");
  assert.equal(d.pedido?.id, 36);
  assert.match(d.nota ?? "", /SIN VERIFICAR/);
  assert.match(d.nota ?? "", /acreditaci/);
  assert.doesNotMatch(d.nota ?? "", /pago registrado|quedó pagado|marcado pagado/i);
  // Decidir es puro: el pedido queda exactamente igual (pendiente, sin pagadoAt).
  assert.equal(pedidos[0].estado, "PENDIENTE_PAGO");
  assert.equal(pedidos[0].pagadoAt, null);
});

test("comprobante que no coincide: va a revisar con lo que debe", () => {
  const d = decidirComprobante([abierto(24, 47476)], comp(30000));
  assert.equal(d.tipo, "revisar");
  assert.equal(d.debe, 47476);
  assert.match(d.nota ?? "", /no coincide/);
});

test("comprobante sin monto legible o sin pedido abierto", () => {
  assert.equal(decidirComprobante([abierto(24, 47476)], comp(null)).tipo, "revisar");
  assert.equal(decidirComprobante([], comp(47476)).tipo, "sin-pedido");
});

test("lo que debe: total, o «cobrar $X» si ya pagó una seña", () => {
  assert.equal(debeDelPedido(abierto(23, 67900, "sin semillas de zapallo: cobrar $64.700")), 64700);
  assert.equal(debeDelPedido(abierto(23, 67900)), 67900);
  const d = decidirComprobante([abierto(23, 67900, "cobrar $64.700")], comp(64700));
  assert.equal(d.tipo, "coincide");
});

test("el detalle del comprobante lleva monto, fecha, destinatario y operación (para que Santiago lo compare rápido)", () => {
  const t = detalleComprobante(comp(74700));
  assert.match(t, /74\.700/);
  assert.match(t, /30\/10\/2026/);
  assert.match(t, /a Santiago A\. R\./);
  assert.match(t, /op\. 123456/);
  assert.match(notaComprobante(t, true), /^Mandó comprobante \(/);
});

test("guardia: el módulo de comprobantes no registra pagos ni cambia estados (solo anota en el historial)", () => {
  const fuente = readFileSync(new URL("./comprobante.ts", import.meta.url), "utf8");
  for (const prohibido of ["registrarPago", "confirmarPago", "registrarCobroAlRecibir", "pagadoAt: new Date", 'estado: "PAGADO"', "order.update"]) {
    assert.equal(fuente.includes(prohibido), false, `comprobante.ts no debe usar ${prohibido}`);
  }
  assert.equal(fuente.includes("orderEvent.create"), true);
});

test("guardia: el vendedor no le dice al cliente que ya quedó pagado por mandar una captura", () => {
  const fuente = readFileSync(new URL("./atencion.ts", import.meta.url), "utf8");
  assert.equal(fuente.includes("lo marqué pagado"), false);
  assert.equal(fuente.includes("no tiene que abonar nada al recibir"), false);
  assert.equal(/tipo === "coincide"/.test(fuente), true);
  assert.equal(/tipo === "registrado"/.test(fuente), false);
});
