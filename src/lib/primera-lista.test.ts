import { test } from "node:test";
import assert from "node:assert/strict";
import { esPrimerPedidoDePrecios, textoPrimeraListaPorKilo, OPCIONES_ZONA_PRIMERA_LISTA, MARCA_PRECIOS_POR_KILO, planWhatsapp } from "./whatsapp-interactivo";

const pesos = (n: number) => `$${n.toLocaleString("es-AR")}`;
const kilo = (producto: string, precio: number) => ({ producto, precio, contenido: 1, unidad: "kg" });
const catalogo = [
  kilo("Mix Clásico con cajú x 1 kg", 15400),
  kilo("Mix Clásico con cajú y girasol x 1 kg", 12500),
  kilo("Nuez Mariposa blanca light x 1 kg", 25000),
  kilo("Castañas de cajú W4 x 1 kg", 27000),
  kilo("Pasas de uva negras sin semilla x 1 kg", 7400),
  kilo("Dátiles Deglet Nour con carozo (Argelia) x 1 kg", 16200),
  { producto: "Nuez Mariposa blanca light x 500 g", precio: 13000, contenido: 500, unidad: "g" },
];

test("experimento B: solo el primer mensaje de una charla de anuncio que pide precios por kilo", () => {
  const base = { texto: "¡Hola! Quiero precios de frutos secos por kilo", historial: [], deAnuncio: true, negocio: "" };
  assert.ok(esPrimerPedidoDePrecios(base));
  assert.ok(!esPrimerPedidoDePrecios({ ...base, deAnuncio: false }), "orgánico: sigue la IA");
  assert.ok(!esPrimerPedidoDePrecios({ ...base, negocio: "<negocio>hotel</negocio>" }), "negocio: sigue su camino");
  assert.ok(!esPrimerPedidoDePrecios({ ...base, historial: [{ de: "acopio" }] }), "ya le contestamos: no se repite");
  assert.ok(!esPrimerPedidoDePrecios({ ...base, texto: "Hola, ¿hacen envíos a Córdoba?" }), "otra pregunta: la contesta la IA");
});

test("experimento B: la lista trae los kilos que más piden, sin combo, sin $60.000 y termina con la zona", () => {
  const t = textoPrimeraListaPorKilo(catalogo, "Raquel", pesos)!;
  assert.ok(t.startsWith(`¡Hola Raquel! ${MARCA_PRECIOS_POR_KILO}:`));
  for (const s of ["Mix clásico con cajú", "Mix con cajú y girasol", "Nuez mariposa $25.000", "Castañas de cajú", "Pasas de uva", "Dátiles"]) assert.ok(t.includes(s), s);
  assert.ok(!t.includes("$13.000"), "solo precios por kilo");
  assert.ok(!/despensa|alacena|60\.000|al recibir/i.test(t));
  assert.ok(t.endsWith("Así te digo el envío: ¿de qué barrio o ciudad sos?"));
  const plan = planWhatsapp({ texto: t, opciones: OPCIONES_ZONA_PRIMERA_LISTA }, null);
  assert.equal(plan[0].tipo, "botones");
});

test("experimento B: sin nombre saluda sin nombre, y con menos de 3 precios vuelve a la IA", () => {
  assert.ok(textoPrimeraListaPorKilo(catalogo, null, pesos)!.startsWith("¡Hola! "));
  assert.equal(textoPrimeraListaPorKilo(catalogo.slice(0, 2), null, pesos), null);
});
