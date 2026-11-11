import { test } from "node:test";
import assert from "node:assert/strict";
import { descripcionLd, imagenesLd, urlAbsoluta } from "./producto-ld";

const base = "https://www.acopiosaludable.com";

test("producto-ld: las fotos propias salen con URL completa y las externas quedan igual", () => {
  assert.equal(urlAbsoluta(base, "/img/productos/prov/tg-pasas.webp"), `${base}/img/productos/prov/tg-pasas.webp`);
  assert.equal(urlAbsoluta(`${base}/`, "img/a.webp"), `${base}/img/a.webp`);
  assert.equal(urlAbsoluta(base, "https://cdn.ejemplo.com/a.jpg"), "https://cdn.ejemplo.com/a.jpg");
});

test("producto-ld: sin fotos usa la foto principal y, si no hay ninguna, no manda image", () => {
  assert.deepEqual(imagenesLd(base, [], "/img/x.webp"), [`${base}/img/x.webp`]);
  assert.equal(imagenesLd(base, [], null), undefined);
});

test("producto-ld: la descripción usa el «por qué lo elegimos» de la ficha o una línea neutra", () => {
  assert.equal(descripcionLd("Pasas x 1 kg", "Frutas desecadas", "  Pasas  grandes,\n sin semilla. "), "Pasas grandes, sin semilla.");
  assert.match(descripcionLd("Pasas x 1 kg", "Frutas desecadas", null), /^Pasas x 1 kg, en frutas desecadas\. Entrega a domicilio/);
});
