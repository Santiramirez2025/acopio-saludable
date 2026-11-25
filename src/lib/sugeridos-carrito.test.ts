import assert from "node:assert/strict";
import { test } from "node:test";
import { armarSugeridos } from "./sugeridos-carrito";
import type { ComboTienda, ProductoTienda } from "./tienda";

const prod = (codigo: string, producto: string, precio: number) => ({ codigo, producto, presentacion: "x 1 kg", precio, fotoUrl: null }) as unknown as ProductoTienda;
const combo = (slug: string, precio: number, disponible: boolean) => ({ slug, nombre: "Trío", precio, disponible, fotoUrl: null }) as unknown as ComboTienda;

test("sugeridos del carrito: los dos mixes primero y después el Trío, con el precio vigente", () => {
  const s = armarSugeridos([prod("TG-MIXC", "Mix con cajú", 12500), prod("TG-MIXCG", "Mix con cajú y girasol", 10500)], [combo("trio-de-frutos-secos", 24000, true)]);
  assert.deepEqual(s.map((x) => [x.id, x.precio]), [["TG-MIXCG", 10500], ["TG-MIXC", 12500], ["trio-de-frutos-secos", 24000]]);
  assert.equal(s[2].href, "/combos/trio-de-frutos-secos");
});

test("sugeridos del carrito: un combo que no se puede comprar no aparece (nunca un link a un 404)", () => {
  const s = armarSugeridos([prod("TG-MIXCG", "Mix", 10500)], [combo("trio-de-frutos-secos", 24000, false)]);
  assert.deepEqual(s.map((x) => x.id), ["TG-MIXCG"]);
});
