import { test } from "node:test";
import assert from "node:assert/strict";
import { avisoReparto, horaSalidaPactada, notaPedidoEnCamino, notaRepartoDeHoy, proximoRepartoTrasHoy, textoResta, textoSalidaReparto } from "./salida-reparto";

// Horas en Argentina (UTC−3) → instante.
const ar = (iso: string) => new Date(`${iso}-03:00`).getTime();

test("pagado antes de las 15 sale hoy, con la cuenta hasta las 15 (vie 13/11 12:50)", () => {
  const a = avisoReparto(ar("2026-11-13T12:50:00"));
  assert.equal(a.dia, "hoy");
  assert.equal(textoResta(a.restaMs!), "2 h 10 min");
});

test("después de las 15 sale mañana, sin cuenta regresiva", () => {
  assert.deepEqual(avisoReparto(ar("2026-11-13T15:00:00")), { dia: "mañana", restaMs: null });
  assert.deepEqual(avisoReparto(ar("2026-11-12T22:30:00")), { dia: "mañana", restaMs: null });
});

test("domingo no hay reparto: sábado a la tarde sale el lunes", () => {
  assert.equal(avisoReparto(ar("2026-11-14T16:00:00")).dia, "el lunes");
  assert.equal(avisoReparto(ar("2026-11-15T10:00:00")).dia, "mañana"); // domingo → el lunes es mañana
  assert.equal(avisoReparto(ar("2026-11-14T09:00:00")).dia, "hoy");
});

test("pasada la medianoche (UTC ya es otro día) se usa la hora de Argentina", () => {
  // Jueves 23:30 AR = viernes 02:30 UTC → sale mañana (viernes), no «hoy».
  assert.equal(avisoReparto(ar("2026-11-12T23:30:00")).dia, "mañana");
});

test("domingo: la nota del bot dice que hoy no hay reparto y que sale mañana lunes (15/11, Miryam y Atilio)", () => {
  const n = notaRepartoDeHoy(ar("2026-11-15T13:27:00"));
  assert.match(n, /hoy es domingo, son las 13:27 y los domingos no hay reparto/);
  assert.match(n, /Lo próximo sale mañana lunes desde las 16/);
  assert.match(n, /No digas «hoy lo tenés», «sale hoy»/);
  assert.equal(textoSalidaReparto(ar("2026-11-15T13:27:00")), "sale mañana lunes en el reparto de las 16");
});

test("sábado después de las 15 sale el lunes; día hábil antes de las 15 sale hoy", () => {
  assert.match(notaRepartoDeHoy(ar("2026-11-14T16:00:00")), /ya pasaron las 15\. Lo próximo sale el lunes desde las 16/);
  assert.equal(textoSalidaReparto(ar("2026-11-14T16:00:00")), "sale el lunes en el reparto de las 16");
  const habil = notaRepartoDeHoy(ar("2026-11-16T10:05:00"));
  assert.match(habil, /hoy es lunes, son las 10:05\. Lo que se paga antes de las 15 sale hoy/);
  assert.doesNotMatch(habil, /No digas/);
  assert.equal(textoSalidaReparto(ar("2026-11-16T10:05:00")), "si llega antes de las 15, sale hoy en el reparto de las 16");
  assert.match(notaRepartoDeHoy(ar("2026-11-17T18:00:00")), /mañana miércoles desde las 16/);
});

test("lo por encargo llega en el próximo reparto después de hoy: el sábado es el lunes, no «mañana»", () => {
  assert.equal(proximoRepartoTrasHoy(ar("2026-11-14T10:00:00")), "el lunes");
  assert.equal(proximoRepartoTrasHoy(ar("2026-11-15T10:00:00")), "mañana");
  assert.equal(proximoRepartoTrasHoy(ar("2026-11-13T10:00:00")), "mañana");
});

test("pedido ENVIADO: el bot no lo pasa a mañana ni pregunta si llegó (Graciela AS-85, 16/11)", () => {
  const n = notaPedidoEnCamino("ENVIADO", "AS-00085", ar("2026-11-16T16:01:00"));
  assert.match(n, /AS-00085 de este cliente ya salió en el reparto de hoy/);
  assert.match(n, /no le digas que sale mañana/);
  assert.match(n, /no le preguntes si le llegó/);
  assert.equal(notaPedidoEnCamino("PENDIENTE_PAGO", "AS-00090"), "");
  assert.equal(notaPedidoEnCamino("ENTREGADO", "AS-00089"), "");
  assert.equal(notaPedidoEnCamino(null, "AS-00001"), "");
});

test("ENVIADO a la mañana: está en el reparto de hoy, todavía no va en camino (Lidia AS-92 y Quique AS-105, 17/11)", () => {
  const lidia = notaPedidoEnCamino("ENVIADO", "AS-00092", ar("2026-11-17T08:40:00"), "PAGA AL RECIBIR $22.000/$24.000");
  assert.match(lidia, /está en el reparto de hoy, que sale desde las 16/);
  assert.match(lidia, /Todavía NO va en camino/);
  assert.doesNotMatch(lidia, /Decile que el cadete va en camino/);
  assert.doesNotMatch(lidia, /Santiago/);
  const quique = notaPedidoEnCamino("ENVIADO", "AS-00105", ar("2026-11-17T16:30:00"), "Entrega a las 19. PAGA AL RECIBIR $22.000/$24.000");
  assert.match(quique, /sale desde las 19/);
  assert.match(quique, /Todavía NO va en camino/);
});

test("ENVIADO después de la hora del reparto: va en camino, sin nombrar a Santiago", () => {
  const n = notaPedidoEnCamino("ENVIADO", "AS-00092", ar("2026-11-17T16:30:00"), "PAGA AL RECIBIR $22.000/$24.000");
  assert.match(n, /el cadete va en camino/);
  assert.match(n, /se lo avisás al equipo/);
  assert.doesNotMatch(n, /Santiago/);
  assert.match(notaPedidoEnCamino("ENVIADO", "AS-00105", ar("2026-11-17T19:05:00"), "a las 19"), /PEDIDO EN CAMINO/);
});

test("hora pactada en las notas", () => {
  assert.equal(horaSalidaPactada("Entrega a las 19"), 19);
  assert.equal(horaSalidaPactada("19:30 hs"), 19.5);
  assert.equal(horaSalidaPactada("PAGA AL RECIBIR $22.000/$24.000"), 16);
  assert.equal(horaSalidaPactada(null), 16);
  assert.equal(horaSalidaPactada("a las 3"), 16);
});
