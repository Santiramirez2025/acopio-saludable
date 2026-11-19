import { test } from "node:test";
import assert from "node:assert/strict";
import { claves, palabrasDeRespaldo } from "./lista-palabras";

test("Norma 17/11: la prosa alrededor no tapa el producto", () => {
  assert.deepEqual(palabrasDeRespaldo("Yo compro todos los años ….nueces"), ["nuez"]);
  assert.deepEqual(palabrasDeRespaldo("Cerezas(hago budines para la flia.)"), ["cereza"]);
});

test("un renglón limpio queda igual", () => {
  assert.deepEqual(palabrasDeRespaldo("castañas"), ["castana"]);
  assert.deepEqual(palabrasDeRespaldo("almendras y avellanas"), ["almendra", "avellana"]);
});

test("claves sigue igual: nueces → nuez y sin vacías", () => {
  assert.deepEqual(claves("Nuez Mariposa blanca light x 1 kg"), ["nuez", "mariposa", "blanca", "light"]);
  assert.ok(claves("1kg. Nueces").includes("nuez"));
});

test("Cristian 18/11: un mix descripto no es una lista, y la cortesía no es producto", async () => {
  const { listaDeProductos } = await import("./whatsapp-interactivo");
  assert.deepEqual(
    listaDeProductos("Hola, consumo un míx de frutos secos q trae nuez, avellanas , almendras y castañas de caju.....comentame si tienen y precio por favor.....gracias"),
    [],
  );
  assert.deepEqual(listaDeProductos("Nueces\nAlmendras\nPasas\nPor favor.....gracias"), ["Nueces", "Almendras", "Pasas"]);
  // Una lista de verdad con «mix» sigue siendo lista.
  assert.equal(listaDeProductos("Hola, precio de mix de semillas, nueces, almendras y castañas").length, 4);
});
