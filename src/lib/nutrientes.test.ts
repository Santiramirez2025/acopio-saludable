import assert from "node:assert/strict";
import { test } from "node:test";
import { INGREDIENTES, nutrientesDe, recomendarMix } from "./nutrientes";

test("nutrientes: la nuez por porción de 30 g y el mix de semillas como suma de sus partes", () => {
  const nuez = nutrientesDe("TG-NUEZ");
  assert.ok(nuez);
  assert.equal(nuez.kcal, Math.round(INGREDIENTES.nuez.kcal * 0.3));
  assert.equal(nuez.grasa, 19.5);
  assert.match(nuez.paraQue, /omega-3/i);
  // La presentación de 500 g comparte los datos del kilo.
  assert.deepEqual(nutrientesDe("TG-NUEZ-500")?.destacados, nuez.destacados);
  const sem = nutrientesDe("LG-MIXSEM");
  assert.ok(sem?.receta && sem.receta.length === 4);
  assert.equal(sem.receta.reduce((a, r) => a + r.partes, 0), 100);
  assert.ok(sem.fibra > nuez.fibra, "las semillas tienen más fibra que la nuez");
  assert.equal(sem.destacados.length, 3);
  // Lo que no es nuestro o no sabemos qué lleva, no se inventa.
  assert.equal(nutrientesDe("8000001"), null);
});

test("nutrientes: el juego recomienda según el objetivo y respeta «sin maní»", () => {
  assert.equal(recomendarMix(["intestino"], false).codigo, "LG-MIXSEM");
  assert.equal(recomendarMix(["corazon", "energia"], false).codigo, "TG-NUEZ");
  assert.equal(recomendarMix(["entrenar"], false).codigo, "TG-MIXC");
  assert.equal(recomendarMix(["entrenar"], true).codigo, "TG-CAJUPASAS", "con maní no se recomienda a quien no lo come");
  assert.equal(recomendarMix(["oficina"], true).codigo, "TG-MIXTSM");
  assert.equal(recomendarMix([], false).codigo, "TG-MIXC");
  for (const r of [recomendarMix(["dulce"], false), recomendarMix(["oficina"], false)]) {
    assert.ok(r.porQue.length > 40 && r.suma, "siempre hay un porqué y algo para sumar");
  }
});
