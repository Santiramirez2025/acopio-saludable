// 13/11: fuera de Carlos Paz y la zona el bot decía «envío $15.000» sin el mínimo de $60.000 y mandaba
// el video «si pagás antes de las 15, hoy lo tenés» a clientes de Córdoba Capital (Luis, Graciela).
import { test } from "node:test";
import assert from "node:assert/strict";
import { conMinimoFueraDeZona, hablaDeFueraDeZona, instruccionCostoEnvio } from "./envio-zona";
import { notaPlazoEntrega } from "./atencion-reglas";
import { fotosOportunas } from "./galeria";

const capital = { lugar: "Urca", costo: 15000, propia: true, detalle: "Envío a Urca: $ 15.000, te lo llevamos nosotros." };

test("Córdoba Capital debajo del mínimo: el costo va con el mínimo y lo que falta", () => {
  const e = conMinimoFueraDeZona(capital, 60000, 28500);
  assert.equal(e.faltaMinimo, 31500);
  assert.match(e.detalle.replace(/\s/g, " "), /compra mínima es \$ 60\.000: a este pedido le faltan \$ 31\.500/);
  const t = instruccionCostoEnvio(e);
  assert.match(t, /Y la compra mínima/);
  assert.doesNotMatch(t, /abajo le quedan los botones/);
  assert.match(t, /No le digas «sale hoy»/);
});

test("Córdoba Capital sin pedido todavía: se dice la regla del mínimo", () => {
  const e = conMinimoFueraDeZona(capital, 60000, 0);
  assert.match(e.detalle, /compra mínima es/);
  assert.equal(e.faltaMinimo, 60000);
});

test("Córdoba Capital que ya llega: sin nota de mínimo, con botones", () => {
  const e = conMinimoFueraDeZona(capital, 60000, 64800);
  assert.equal(e.faltaMinimo, 0);
  assert.doesNotMatch(e.detalle, /mínima/);
  assert.match(instruccionCostoEnvio(e), /abajo le quedan los botones/);
});

test("Zona propia: no se toca (sin mínimo)", () => {
  const propia = { lugar: "Carlos Paz", costo: 0, propia: true, zonaPropia: true, detalle: "Envío a Carlos Paz: sin cargo." };
  assert.equal(conMinimoFueraDeZona(propia, 60000, 15000), propia);
  assert.match(instruccionCostoEnvio(propia), /no hay compra mínima/);
});

test("hablaDeFueraDeZona", () => {
  assert.ok(hablaDeFueraDeZona("Córdoba Capital (correo)"));
  assert.ok(hablaDeFueraDeZona("Envío a Urca: $15.000"));
  assert.ok(hablaDeFueraDeZona("Santa María de Punilla, va por correo"));
  assert.ok(!hablaDeFueraDeZona("Villa Carlos Paz"));
  assert.ok(!hablaDeFueraDeZona("cuándo llega?"));
});

test("notaPlazoEntrega: pedido de Córdoba Capital sin «antes de las 15»", () => {
  const n = notaPlazoEntrega("PENDIENTE_PAGO", "Córdoba Capital (correo)");
  assert.match(n, /24 a 48 h hábiles/);
  assert.doesNotMatch(n, /sale ese mismo día/);
  assert.match(notaPlazoEntrega("PENDIENTE_PAGO", "Villa Carlos Paz"), /antes de las 15, sale ese mismo día/);
});

test("el video del reparto en el día no sale si el envío es a Córdoba Capital", () => {
  const vacio: never[] = [];
  const fuera = fotosOportunas({ entrante: "cuánto sale el envío a Córdoba capital?", respuesta: "Envío a Córdoba Capital: $15.000", historial: vacio });
  assert.ok(!fuera.some((f) => f.url.includes("repartimos-cada-dia")));
  const zona = fotosOportunas({ entrante: "cuánto sale el envío a Carlos Paz?", respuesta: "Envío a Carlos Paz: sin cargo desde $20.000", historial: vacio });
  assert.ok(zona.some((f) => f.url.includes("repartimos-cada-dia")));
});
