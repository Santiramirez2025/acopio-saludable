import { test } from "node:test";
import assert from "node:assert/strict";
import { elegirDestacado, ordenarCombos } from "./destacado-inicio";

const trio = { slug: "trio-del-desayuno", disponible: true };
const pan = { slug: "pan-dulce-casero", disponible: true };
const desayuno = { slug: "desayuno-30-dias", disponible: true };

test("inicio: con el mix de la casa a la venta, va el mix", () => {
  const r = elegirDestacado([{ codigo: "TG-PASAS" }, { codigo: "TG-MIXC" }], [trio]);
  assert.equal(r?.tipo, "producto");
  assert.equal(r?.tipo === "producto" && r.p.codigo, "TG-MIXC");
});

test("inicio: sin el mix (falta almendra), va el Trío del desayuno y no las pasas", () => {
  const r = elegirDestacado([{ codigo: "TG-PASAS" }], [desayuno, pan, trio]);
  assert.equal(r?.tipo === "combo" && r.c.slug, "trio-del-desayuno");
});

test("inicio: si el Trío no se puede vender, va el Pan dulce; si ninguno, las pasas", () => {
  const r1 = elegirDestacado([{ codigo: "TG-PASAS" }], [{ ...trio, disponible: false }, pan]);
  assert.equal(r1?.tipo === "combo" && r1.c.slug, "pan-dulce-casero");
  const r2 = elegirDestacado([{ codigo: "TG-PASAS" }], [desayuno]);
  assert.equal(r2?.tipo === "producto" && r2.p.codigo, "TG-PASAS");
  assert.equal(elegirDestacado([], []), null);
});

test("combos: los de la semana primero y el resto en su orden", () => {
  const r = ordenarCombos([desayuno, { slug: "a", disponible: true }, pan, trio]).map((c) => c.slug);
  assert.deepEqual(r, ["trio-del-desayuno", "pan-dulce-casero", "desayuno-30-dias", "a"]);
});
