import { test } from "node:test";
import assert from "node:assert/strict";
import { plazoZonaPropia } from "./salida-reparto";
import { cotizarEnvio, type ConfigEnvio } from "./envios/cotizar";
import { TABLA_EJEMPLO } from "./envios/tabla";
import { plantillaViajeVigente } from "./viaje-cordoba-precio";

const ar = (iso: string) => new Date(`${iso}-03:00`).getTime();

test("zona propia: el plazo por defecto «24 a 48 hs hábiles» se cambia por el reparto real (lun 16/11 11:00)", () => {
  assert.equal(plazoZonaPropia("24 a 48 hs hábiles", ar("2026-11-16T11:00:00")), "el reparto de hoy a las 16 si se paga antes de las 15 (si no, mañana martes desde las 16)");
  assert.equal(plazoZonaPropia(undefined, ar("2026-11-16T15:30:00")), "el reparto de mañana martes desde las 16");
});

test("zona propia: sábado a la mañana el «si no» es el lunes; domingo dice el lunes", () => {
  assert.equal(plazoZonaPropia("", ar("2026-11-14T10:00:00")), "el reparto de hoy a las 16 si se paga antes de las 15 (si no, el lunes desde las 16)");
  assert.equal(plazoZonaPropia("24 a 48 hs hábiles", ar("2026-11-15T10:00:00")), "el reparto de mañana lunes desde las 16");
});

test("zona propia: si Santiago escribió otro plazo en el panel, manda el suyo", () => {
  assert.equal(plazoZonaPropia("el día, coordinando por WhatsApp", ar("2026-11-16T11:00:00")), "el día, coordinando por WhatsApp");
});

test("checkout: la entrega propia ya no dice «24 a 48 hs hábiles» (lun 16/11 14:00)", async () => {
  const cfg: ConfigEnvio = { cpOrigen: "5152", entregaPropiaActiva: true, cpEntregaPropia: "5152", plazoEntregaPropia: "24 a 48 hs hábiles", envioGratisDesde: null, tabla: TABLA_EJEMPLO };
  const [o] = (await cotizarEnvio(cfg, { cpDestino: "5152", provincia: "Córdoba", bultos: [{ pesoG: 3000, unidades: 3, excedido: false }], subtotal: 22000 }, [], ar("2026-11-16T14:00:00"))).filter((x) => x.id === "propia");
  assert.ok(o, "hay opción propia");
  assert.doesNotMatch(o.plazo, /24 a 48/);
  assert.match(o.plazo, /hoy a las 16 si se paga antes de las 15/);
});

test("plantilla del viaje a Córdoba: con el envío a $9.000 no sale (dice $5.000)", () => {
  assert.equal(plantillaViajeVigente(9000), false);
  assert.equal(plantillaViajeVigente(null), false);
  assert.equal(plantillaViajeVigente(5000), true);
});
