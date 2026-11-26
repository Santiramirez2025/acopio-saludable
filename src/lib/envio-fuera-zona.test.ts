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
  const zona = fotosOportunas({ entrante: "cuánto sale el envío a Carlos Paz?", respuesta: "Envío a Carlos Paz: sin cargo desde $20.000", historial: vacio, ahoraMs: new Date("2026-11-13T12:00:00-03:00").getTime() });
  assert.ok(!zona.some((f) => f.url.includes("repartimos-cada-dia"))); // 21/11: el video se dio de baja
});

test("domingo o pasadas las 15 no sale el video «si pagás antes de las 15, hoy lo tenés» (15/11, Nanci)", () => {
  const vacio: never[] = [];
  const pregunta = { entrante: "cuándo me llega?", respuesta: "Te lo llevamos sin cargo", historial: vacio };
  const domingo = fotosOportunas({ ...pregunta, ahoraMs: new Date("2026-11-15T11:00:00-03:00").getTime() });
  assert.ok(!domingo.some((f) => f.url.includes("repartimos-cada-dia")));
  const tarde = fotosOportunas({ ...pregunta, ahoraMs: new Date("2026-11-16T17:00:00-03:00").getTime() });
  assert.ok(!tarde.some((f) => f.url.includes("repartimos-cada-dia")));
  const manana = fotosOportunas({ ...pregunta, ahoraMs: new Date("2026-11-16T11:00:00-03:00").getTime() });
  assert.ok(!manana.some((f) => f.url.includes("repartimos-cada-dia"))); // 21/11: el video se dio de baja
  // 21/11: una imagen por respuesta, nunca la misma dos veces.
  const primera = fotosOportunas({ entrante: "cuánto sale el mix?", respuesta: "El mix sale $10.500", historial: vacio });
  if (primera[0]) {
    const otra = fotosOportunas({ entrante: "cuánto sale el mix?", respuesta: "El mix sale $10.500", historial: [{ de: "acopio", texto: `[${primera[0].url.endsWith(".mp4") ? "Video" : "Foto"}] ${primera[0].pie}` }] as never });
    assert.ok(!otra.some((f) => f.url === primera[0].url));
  }
  assert.ok(fotosOportunas({ entrante: "cuánto sale el mix?", respuesta: "El mix sale $10.500", historial: vacio }).length <= 1);
});

test("fotos: cuando el cliente se entusiasma se le muestra un kit que no vio, con el precio en el pie", () => {
  const f = fotosOportunas({ entrante: "Me gustó todooooo", respuesta: "¡Qué bueno, Patricia!", historial: [] as never });
  assert.equal(f.length, 1);
  assert.match(f[0].url, /combo-trio-de-la-manana/);
  assert.match(f[0].pie, /\{combo:trio-de-la-manana\}/);
  const p = fotosOportunas({ entrante: "cuánto sale la nuez?", respuesta: "La nuez sale $24.500", historial: [{ de: "acopio", texto: "[Video] Así armamos tu mix de frutos secos" }] as never });
  assert.match(p[0].pie, /Nuez mariposa · \{precio:TG-NUEZ\} el kilo/);
});

test("fotos: a quien pidió el Trío, en la respuesta siguiente le va el video mudo de los dátiles, una sola vez", () => {
  const h = [{ de: "yo", texto: "Hola, quiero el Trío con las 3 recetas" }, { de: "acopio", texto: "[Foto] Trío de frutos secos · mix con cajú, dátiles y pasas (3 kg): $ 24.000" }, { de: "acopio", texto: "¿De qué ciudad sos?" }];
  const f = fotosOportunas({ entrante: "De Carlos Paz", respuesta: "Dale, el envío es $3.000. ¿Me pasás calle y número?", historial: h as never });
  assert.equal(f.length, 1);
  assert.match(f[0].url, /lg-datil-mudo\.mp4$/);
  const otra = fotosOportunas({ entrante: "San Martín 100", respuesta: "Anotado.", historial: [...h, { de: "acopio", texto: `[Video] ${f[0].pie}` }] as never });
  assert.ok(!otra.some((x) => /lg-datil/.test(x.url)));
  const no = fotosOportunas({ entrante: "No me sirve gracias", respuesta: "Dale, gracias.", historial: h as never });
  assert.equal(no.length, 0);
});

test("fotos: si pide ver qué otro combo hay, van hasta 3 kits juntos con el precio en el pie", () => {
  const f = fotosOportunas({ entrante: "Ok . Aparte del trío tenés otro combo", respuesta: "Sí, tenemos la Despensa de 4 kilos a $28.000.", historial: [{ de: "acopio", texto: "[Foto] Trío de frutos secos · mix con cajú, dátiles y pasas (3 kg): $ 24.000" }, { de: "acopio", texto: "[Video] Así son los dátiles del Trío: carnosos y con carozo · recién fraccionados" }] as never });
  assert.equal(f.length, 3);
  assert.match(f[0].url, /combo-despensa-4-kilos/);
  assert.ok(f.every((x) => /\{combo:/.test(x.pie) && !/trio-de-frutos/.test(x.url)));
});

import { postergaCompra as _posterga } from "./whatsapp-interactivo";
test("26/11 Roberto: «Te llamo cuando esté en Carlos Paz» es esperar, no insistir", () => {
  for (const t of ["Te llamo cuando esté en Carlos paz", "Te aviso cuando si voy a la tarde", "Te confirmo el finde", "Después decido"]) assert.equal(_posterga(t), true, t);
  for (const t of ["Lo quiero", "Hola, quiero el Trío con las 3 recetas", "Sí, dejalo listo", "quiero el trio para la semana que viene"]) assert.equal(_posterga(t), false, t);
});

import { pideCambioDePedido } from "./pedido-charla";
test("26/11 María Ilda: «Te confirmo 2 trios» con el pedido tomado es un cambio que no se puede perder", () => {
  for (const t of ["Te confirmo 2 trios, uno para mí ,otro para mí hijo.En el mismo domicilio.", "sumame un kilo de nuez", "agregá la miel", "en vez de pasas, avena"]) assert.equal(pideCambioDePedido(t), true, t);
  for (const t of ["Si te pido 2 combos de 24 mil el envío es gratis ?", "A qué hora es el reparto?", "Gracias", "Montecattini 888"]) assert.equal(pideCambioDePedido(t), false, t);
});

import { asienteAlCierre, confirmaPedido } from "./whatsapp-interactivo";
test("26/11 Bety: «Ok» a «¿Lo dejamos confirmado? [Botones…]» confirma el pedido", () => {
  const prev = "Gracias, Oliva Beatriz. Mañana viernes desde las 16 te llevamos el Trío y lo pagás al recibir: $27.000 con envío. ¿Lo dejamos confirmado? [Botones: Sí, confirmalo · Tengo una duda]";
  assert.equal(asienteAlCierre("Ok", prev), true);
  assert.equal(confirmaPedido("Sí, confirmalo"), true);
  assert.equal(asienteAlCierre("Ok gracias", prev), false);
});

import { clienteNombraFueraDeZona as _fuera } from "./pedido-charla";
test("26/11 Myriam y Su: calles con nombre de provincia no sacan de la zona", () => {
  assert.equal(_fuera([], "La Antartida 598 esq San Luis . Podra ser tipo 17.30 ?"), false);
  assert.equal(_fuera([], "La Antártida 610 (entre San Luis y Mendoza), B° Malvinas"), false);
  assert.equal(_fuera([], "Av. Colón 1234, Córdoba"), true);
  assert.equal(_fuera([], "Soy de Mendoza"), true);
});
