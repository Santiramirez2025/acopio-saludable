// La barra de arriba y el atajo del inicio (Tomi 21/11).
import { test } from "node:test";
import assert from "node:assert/strict";
import { barraArriba, cargoMinimoVecinas } from "./minimo-zona";
import { CARGO_CERCA } from "./envios/vecinas";
import { atajoCombo } from "./destacado-inicio";

const cfg = { compraMinima: 60000, compraMinimaPropia: 20000, envioBajoMinimo: 3000, entregaPropiaActiva: true };

test("la barra no promete sin cargo en toda la zona: vecinas desde el cargo más bajo", () => {
  assert.equal(cargoMinimoVecinas(), CARGO_CERCA);
  assert.deepEqual(barraArriba(cfg), { sinCargoDesde: 20000, bajoUmbral: 3000, vecinasDesde: CARGO_CERCA, paisDesde: 60000 });
});

test("el atajo del inicio nunca apunta a un combo que no se puede comprar", () => {
  const c = (slug: string, disponible: boolean) => ({ slug, nombre: slug, disponible });
  assert.deepEqual(atajoCombo([c("kit-semanal", true), c("trio-de-frutos-secos", true)]), { slug: "kit-semanal", nombre: "kit-semanal" });
  assert.deepEqual(atajoCombo([c("kit-semanal", false), c("trio-de-frutos-secos", true)]), { slug: "trio-de-frutos-secos", nombre: "trio-de-frutos-secos" });
  assert.equal(atajoCombo([c("kit-semanal", false), c("otro", true)]), null);
});
