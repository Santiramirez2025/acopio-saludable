import { test } from "node:test";
import assert from "node:assert/strict";
import { descripcionFeed, descripcionLd, imagenesLd, tituloLimpio, urlAbsoluta } from "./producto-ld";

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

test("producto-ld: el título del feed no termina en punto", () => {
  assert.equal(tituloLimpio("Banana Chips x 500 g."), "Banana Chips x 500 g");
  assert.equal(tituloLimpio("Pasas x 1 kg"), "Pasas x 1 kg");
});

test("producto-ld: el feed usa el «por qué lo elegimos» de la ficha y si no hay, la línea neutra sin doble punto", () => {
  assert.equal(descripcionFeed("Pasas x 1 kg", "Frutas desecadas", "Sin marca", "  Negras,  sin semilla. "), "Negras, sin semilla.");
  assert.equal(
    descripcionFeed("Banana Chips x 500 g.", "Frutas desecadas", "Sin marca", null),
    "Banana Chips x 500 g. Frutas desecadas. Entrega a domicilio en Villa Carlos Paz y el sur de Punilla, y envíos a todo el país.",
  );
  assert.equal(descripcionFeed("Miel x 480 g", "", "Apícola X", null), "Miel x 480 g de Apícola X. Entrega a domicilio en Villa Carlos Paz y el sur de Punilla, y envíos a todo el país.");
});
