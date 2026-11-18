import { test } from "node:test";
import assert from "node:assert/strict";
import { nombraElTrio, textoComboSinIA } from "./whatsapp-interactivo";

const pesos = (n: number) => `$${n.toLocaleString("es-AR")}`;
const trio = {
  slug: "trio-de-frutos-secos",
  nombre: "Trío de frutos secos · mix con cajú, dátiles y pasas (3 kg)",
  precio: 24000,
  items: [
    { producto: { producto: "Mix Clásico con cajú y girasol", presentacion: "x 1 kg" }, cantidad: 1 },
    { producto: { producto: "Dátiles con carozo", presentacion: "x 1 kg" }, cantidad: 1 },
    { producto: { producto: "Pasas de uva negras sin semilla", presentacion: "x 1 kg" }, cantidad: 1 },
  ],
};

test("el texto precargado del anuncio nombra el Trío", () => {
  assert.equal(nombraElTrio("Hola, vi el video del Trío y lo quiero"), true);
  assert.equal(nombraElTrio("quiero el trio"), true);
  assert.equal(nombraElTrio("Hola, quiero precios"), false);
  assert.equal(nombraElTrio("triología"), false);
});

test("sin IA, el Trío sale con precio, transferencia, link y la ciudad", () => {
  const t = textoComboSinIA({ combo: trio, conTransferencia: 22000, nombre: "Elizabeth", sinCargoDesde: 20000, sitio: "https://www.acopiosaludable.com", pesos })!;
  assert.match(t, /^¡Hola Elizabeth! El Trío de frutos secos trae 1 kg de mix Clásico con cajú y girasol, 1 kg de dátiles con carozo y 1 kg de pasas de uva negras sin semilla: \$22\.000 pagando antes por transferencia, o \$24\.000 al recibir\./);
  assert.match(t, /carrito\?p=c-trio-de-frutos-secos\*1&utm_source=whatsapp/);
  assert.match(t, /¿De qué ciudad sos\? En Carlos Paz te lo llevamos sin cargo\./);
  assert.doesNotMatch(t, /perfecto|antes de pagar|Santiago/i);
});

test("un combo chico no promete envío sin cargo, y sin precio no hay texto", () => {
  const chico = { ...trio, precio: 15000 };
  const t = textoComboSinIA({ combo: chico, conTransferencia: null, nombre: null, sinCargoDesde: 20000, sitio: "https://x", pesos })!;
  assert.match(t, /^¡Hola! /);
  assert.doesNotMatch(t, /sin cargo|transferencia/);
  assert.equal(textoComboSinIA({ combo: { ...trio, precio: 0 }, conTransferencia: null, nombre: null, sinCargoDesde: 20000, sitio: "https://x", pesos }), null);
});
