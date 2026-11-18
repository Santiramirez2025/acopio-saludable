// Pasar un pedido a «cobrar al entregar» lo manda a la pizarra de armado sin pago (Rodri, 14/11).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { alRecibirBloqueo, botPasaAlRecibir } from "./cobro-permiso";
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

test("el bot pasa a cobrar al entregar solo un pedido por transferencia, sin pagar, en la zona propia (AS-86, 17/11)", () => {
  assert.equal(botPasaAlRecibir(pend, z("Villa Carlos Paz")), true);
  assert.equal(botPasaAlRecibir(pend, z("San Antonio de Arredondo")), true);
  assert.equal(botPasaAlRecibir(pend, z("Córdoba capital")), false);
  assert.equal(botPasaAlRecibir(pend, z("A confirmar")), false);
  assert.equal(botPasaAlRecibir({ ...pend, pagado: true }, z("Villa Carlos Paz")), false);
  assert.equal(botPasaAlRecibir({ ...pend, estado: "ENVIADO" }, z("Villa Carlos Paz")), false);
  assert.equal(botPasaAlRecibir({ ...pend, medioPago: "MERCADOPAGO" }, z("Villa Carlos Paz")), false);
  assert.equal(botPasaAlRecibir({ ...pend, medioPago: "AL_RECIBIR" }, z("Villa Carlos Paz")), false);
});

test("atencion.ts: el cambio a cobrar al entregar pasa por botPasaAlRecibir y deja un evento", () => {
  const src = readFileSync(new URL("./atencion.ts", import.meta.url), "utf8");
  assert.match(src, /pagaAlRecibir\(texto\)\) \{\n\s+const id = Number\(guardado\.slice\(6\)\)/);
  assert.match(src, /botPasaAlRecibir\(\{ estado: o\.estado/);
  assert.match(src, /Pasa a cobrar al entregar \(bot, el cliente dijo/);
});
