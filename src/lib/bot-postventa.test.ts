import { test } from "node:test";
import assert from "node:assert/strict";
import { instruccionPedidoNegocio, notaPedidoQueSalio, notaPedidoSinPagar, notaPlazoEntrega, pieFotoCombo, rubroRevende, yaMandoComprobante } from "./atencion-reglas";
import { reglaMinimo } from "./minimo-vendedor";
import { notaComprobante } from "./comprobante";

test("AS-00042: un pedido ENVIADO no se promete en el reparto de hoy ni con plazo", () => {
  const n = notaPedidoQueSalio("ENVIADO");
  assert.doesNotMatch(n, /Ya está en el reparto/);
  assert.match(n, /no digas que sale hoy/);
  assert.match(n, /pasar_a_whatsapp/);
  assert.equal(notaPlazoEntrega("ENVIADO"), "");
  assert.equal(notaPlazoEntrega("ENTREGADO"), "");
  assert.match(notaPlazoEntrega("PAGADO"), /reparto de las 16/);
  assert.match(notaPlazoEntrega("PAGADO"), /24 a 48 h hábiles más el plazo del correo/);
  // Pedido sin pagar: la regla del reparto (antes de las 15 sale hoy), no «no prometas día» (13/11).
  assert.match(notaPlazoEntrega("PENDIENTE_PAGO"), /antes de las 15, sale ese mismo día/);
  assert.doesNotMatch(notaPlazoEntrega("PENDIENTE_PAGO"), /No prometas un día/);
  assert.match(notaPlazoEntrega(null), /reparto de las 16/);
});

test("ENTREGADO: agradece, y si falta algo deriva sin prometer", () => {
  const n = notaPedidoQueSalio("ENTREGADO");
  assert.match(n, /YA LO RECIBIÓ/);
  assert.match(n, /le falta algo/);
  assert.equal(notaPedidoQueSalio("PAGADO"), "");
});

test("AS-00043: con comprobante no se vuelve a preguntar, y no se da por pagado", () => {
  assert.equal(yaMandoComprobante([null, "Venta por WhatsApp"]), false);
  assert.equal(yaMandoComprobante([notaComprobante("$26.200", true)]), true);
  assert.equal(yaMandoComprobante([notaComprobante("$1", false)]), true);
  const n = notaPedidoSinPagar("TRANSFERENCIA", true);
  assert.match(n, /YA MANDÓ EL COMPROBANTE/);
  assert.match(n, /No digas que está pagado/);
  assert.match(notaPedidoSinPagar("TRANSFERENCIA"), /TODAVÍA NO PAGÓ/);
  assert.match(notaPedidoSinPagar("AL_RECIBIR", true), /se respeta/);
});

test("reventa solo a quien revende", () => {
  for (const r of ["dieteticas", "kioscos"]) {
    assert.equal(rubroRevende(r), true);
    assert.match(instruccionPedidoNegocio(r), /revendiéndolo/);
  }
  for (const r of ["hoteleria", "gimnasios", "cafeterias", "rotiserias", "oficinas", "familias"]) {
    assert.equal(rubroRevende(r), false);
    assert.match(instruccionPedidoNegocio(r), /sin hablar de reventa/);
    assert.match(instruccionPedidoNegocio(r), /A cuánto estás pagando/);
  }
});

test("el pie de la foto del combo lleva el precio", () => {
  assert.equal(pieFotoCombo("Despensa de 4 kilos", "$28.500", "$26.200"), "Despensa de 4 kilos: $28.500, o $26.200 por transferencia");
  assert.equal(pieFotoCombo("Despensa", "$28.500", null), "Despensa: $28.500");
});

test("el mínimo no se le dice a un lugar de reparto propio fuera de Carlos Paz", () => {
  const r = reglaMinimo("$60.000", "$20.000", "$3.000");
  assert.match(r, /Vertientes de Arredondo/);
  assert.match(r, /está fuera de Carlos Paz/);
});
