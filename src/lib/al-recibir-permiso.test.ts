// Pasar un pedido a «cobrar al entregar» lo manda a la pizarra de armado sin pago (Rodri, 14/11).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { alRecibirBloqueo } from "./cobro-permiso";
import { zonaDeLugar } from "./envio-zona";

const pend = { estado: "PENDIENTE_PAGO", medioPago: "TRANSFERENCIA", pagado: false };
const z = (c: string) => zonaDeLugar(c)?.tipo ?? null;

test("en la zona propia y esperando el pago, un agente puede pasarlo a cobrar al entregar", () => {
  assert.equal(alRecibirBloqueo(pend, z("Villa Carlos Paz")), null);
  assert.equal(alRecibirBloqueo(pend, z("San Antonio de Arredondo")), null);
  assert.equal(alRecibirBloqueo(pend, z("Córdoba capital")), null);
});

test("fuera de la zona, sin ciudad, pagado, cancelado o enviado: no sin la sesión de Santiago", () => {
  assert.ok(alRecibirBloqueo(pend, z("Rosario, Santa Fe")));
  assert.ok(alRecibirBloqueo(pend, z("A confirmar")));
  assert.ok(alRecibirBloqueo({ ...pend, pagado: true }, z("Carlos Paz")));
  assert.ok(alRecibirBloqueo({ ...pend, estado: "CANCELADO" }, z("Carlos Paz")));
  assert.ok(alRecibirBloqueo({ ...pend, estado: "ENVIADO" }, z("Carlos Paz")));
  assert.ok(alRecibirBloqueo({ ...pend, estado: "PAGADO", medioPago: "MERCADOPAGO", pagado: true }, z("Carlos Paz")));
});

test("si ya era al recibir no cambia nada", () => {
  assert.equal(alRecibirBloqueo({ ...pend, medioPago: "AL_RECIBIR", estado: "ENVIADO" }, null), null);
});

test("la ruta /pedidos/entrega aplica el control antes de cambiar el medio de pago", () => {
  const src = readFileSync("src/app/api/admin/pedidos/entrega/route.ts", "utf8");
  assert.match(src, /alRecibirBloqueo\(/);
  assert.match(src, /esSesionAdmin\(\)/);
  assert.ok(src.indexOf("alRecibirBloqueo(") < src.indexOf('data.medioPago = "AL_RECIBIR"'));
});
