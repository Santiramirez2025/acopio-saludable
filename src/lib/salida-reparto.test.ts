import { test } from "node:test";
import assert from "node:assert/strict";
import { avisoReparto, textoResta } from "./salida-reparto";

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
