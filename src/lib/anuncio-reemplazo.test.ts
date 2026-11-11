import { test } from "node:test";
import assert from "node:assert/strict";
import { comboParecido } from "./anuncio-reemplazo";

const it = (...cs: string[]) => cs.map((codigo) => ({ producto: { codigo } }));
const despensa = { slug: "despensa", nombre: "Despensa de 4 kilos", disponible: false, precio: 35200, items: it("MIX", "DATIL", "PASAS", "SEM") };
const trio = { slug: "trio-del-desayuno", nombre: "Trío del desayuno", disponible: true, precio: 21500, items: it("SEM", "DATIL", "PASAS") };
const pan = { slug: "pan-dulce", nombre: "Pan dulce casero", disponible: true, precio: 22000, items: it("PASAS", "DATIL") };
const alacena = { slug: "alacena", nombre: "Alacena", disponible: false, precio: 45000, items: it("MIX", "DATIL", "PASAS", "SEM") };
const nada = { slug: "gym", nombre: "Pack gym", disponible: true, precio: 30000, items: it("QUINOA") };

test("elige el disponible que comparte más productos", () => {
  assert.equal(comboParecido(despensa, [pan, trio, alacena, nada])?.slug, "trio-del-desayuno");
});

test("nunca ofrece otro agotado ni uno sin nada en común", () => {
  assert.equal(comboParecido(despensa, [alacena, nada]), null);
});

test("a igualdad de productos, el de precio más cercano", () => {
  const caro = { ...pan, slug: "pan-caro", precio: 34000 };
  assert.equal(comboParecido(despensa, [pan, caro])?.slug, "pan-caro");
});

import { comboAgotadoPedido } from "./anuncio-reemplazo";

test("a mitad de charla: «los 4k surtido» es la Despensa agotada", () => {
  assert.equal(comboAgotadoPedido("Cuanto sale los 4k  surtido", [trio, despensa, pan])?.slug, "despensa");
  assert.equal(comboAgotadoPedido("precio de la despensa", [trio, despensa])?.slug, "despensa");
  assert.equal(comboAgotadoPedido("4 kilos", [trio, despensa])?.slug, "despensa");
});

test("no confunde lo que no es un combo agotado", () => {
  assert.equal(comboAgotadoPedido("nuez mani caju", [trio, despensa, pan]), null);
  assert.equal(comboAgotadoPedido("trío del desayuno", [trio, despensa]), null);
  assert.equal(comboAgotadoPedido("1 kg de pasas", [trio, despensa]), null);
});
