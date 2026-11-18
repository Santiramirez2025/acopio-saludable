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

test("trío: «el acopio x 3» y parecidos nombran el Trío; «3 kilos de nuez» no", () => {
  for (const t of ["Me interesó el aviso por facebook, el acopio x 3", "quiero el de 3", "los 3 kilos", "el combo por 3", "vi lo de 3 kilos, 3 recetas"]) assert.equal(nombraElTrio(t), true, t);
  for (const t of ["quiero 3 kilos de nuez", "x 3 kg de pasas", "somos 3", "a las 3", "se puede pagar x 3 cuotas?", "son 30 mil?"]) assert.equal(nombraElTrio(t), false, t);
});

test("vendedor: lo que se vio en el aviso nunca es «no lo tenemos»", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("./vendedor.ts", import.meta.url), "utf8");
  assert.match(src, /LO DEL AVISO EXISTE/);
});
