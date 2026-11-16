// 15/11 (seguridad): un mensaje nuestro que niega o limita el pago al recibir no es una oferta,
// y una ciudad fuera de la zona en la charla tampoco deja cerrar un pedido Cobrar al entregar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { aceptamosAlRecibir } from "./whatsapp-interactivo";
import { lugarDelHistorial } from "./pedido-charla";
import { zonaDeLugar } from "./envio-zona";

test("15/11: las ofertas reales de pago al recibir se siguen reconociendo", () => {
  assert.ok(aceptamosAlRecibir("Te lo llevo en el reparto de las 16. Lo pagás cuando te lo llevo, en efectivo o transferencia 🙌 ¿Te lo dejo listo?"));
  assert.ok(aceptamosAlRecibir("Anotamos Santo Cabral 212, y pagás en efectivo al recibir. ¿Lo dejamos listo?"));
  assert.ok(aceptamosAlRecibir("En Carlos Paz no hay compra mínima. Lo pagás cuando te lo llevo, en efectivo o transferencia. ¿Te lo dejo listo?"));
});

test("15/11: una negación o un límite del pago al recibir no cuenta como oferta", () => {
  assert.ok(!aceptamosAlRecibir("Para Córdoba capital no hacemos pago al recibir: es por transferencia. ¿Te paso los datos?"));
  assert.ok(!aceptamosAlRecibir("Fuera de la zona el pago es anticipado, no al recibir. ¿Te paso los datos para transferir?"));
  assert.ok(!aceptamosAlRecibir("Por correo no se puede pagar contra entrega, va con pago anticipado."));
  assert.ok(!aceptamosAlRecibir("Fuera de Carlos Paz no hay pago al recibir."));
});

test("15/11: Córdoba capital en la charla no es zona propia (no habilita Cobrar al entregar)", () => {
  const hist = [
    { de: "acopio" as const, texto: "¿De qué ciudad sos?" },
    { de: "yo" as const, texto: "Córdoba capital" },
  ];
  const lugar = lugarDelHistorial(hist);
  assert.ok(lugar);
  assert.notEqual(zonaDeLugar(String(lugar), null)?.tipo, "propia");
  assert.equal(zonaDeLugar("Villa Carlos Paz", null)?.tipo, "propia");
});

test("16/11: una dirección con ciudad fuera de la zona no confirma Cobrar al entregar", async () => {
  const { clienteNombraFueraDeZona } = await import("./pedido-charla");
  const ofrecimos = { de: "acopio" as const, texto: "¿Me pasás calle y número? Te lo llevamos sin cargo y lo pagás cuando te llega 🙌" };
  assert.ok(clienteNombraFueraDeZona([ofrecimos], "Av. Colón 1234, Córdoba capital"));
  assert.ok(clienteNombraFueraDeZona([ofrecimos], "Rivadavia 55, Malagueño"));
  assert.ok(clienteNombraFueraDeZona([{ de: "yo", texto: "soy de Nueva Córdoba" }, ofrecimos], "Obispo Trejo 300"));
  assert.ok(clienteNombraFueraDeZona([ofrecimos], "mandalo por correo, Belgrano 20"));
  assert.ok(clienteNombraFueraDeZona([ofrecimos], "San Martín 400, Rosario, Santa Fe"));
});

test("16/11: las direcciones de la zona propia siguen confirmando", async () => {
  const { clienteNombraFueraDeZona } = await import("./pedido-charla");
  const ofrecimos = { de: "acopio" as const, texto: "Lo pagás cuando te lo llevo. ¿Me pasás calle y número?" };
  assert.ok(!clienteNombraFueraDeZona([ofrecimos], "Saavedra 165, avisame y bajo"));
  assert.ok(!clienteNombraFueraDeZona([ofrecimos], "Los espero 🩷"));
  assert.ok(!clienteNombraFueraDeZona([{ de: "yo", texto: "Tanti" }, ofrecimos], "Los Algarrobos 12"));
  assert.ok(!clienteNombraFueraDeZona([ofrecimos], "Libertad 300, Villa Carlos Paz, Córdoba"));
  assert.ok(!clienteNombraFueraDeZona([{ de: "yo", texto: "quiero el trío y 1 kg de nuez" }, ofrecimos], "San Antonio de Arredondo, calle 5 nro 20"));
});
