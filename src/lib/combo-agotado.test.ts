import { test } from "node:test";
import assert from "node:assert/strict";
import config, { ALIAS_COMBOS } from "../../next.config";
import { alternativas, mensajeSinStock, nombreCorto, textoSinStock } from "./combo-agotado";

test("el nombre corto saca la presentación", () => {
  assert.equal(nombreCorto("Dátiles con carozo x 1 kg"), "dátiles con carozo");
  assert.equal(nombreCorto("Miel de abejas pura x 500 g"), "miel de abejas pura");
});

test("sin stock nombra lo que falta y nunca promete un día", () => {
  assert.equal(textoSinStock(["Dátiles con carozo x 1 kg"]), "Hoy sin stock: vuelve apenas tengamos de nuevo dátiles con carozo.");
  assert.equal(textoSinStock(["Dátiles con carozo x 1 kg", "Dátiles con carozo x 500 g", "Nuez Mariposa x 1 kg"]), "Hoy sin stock: vuelve apenas tengamos de nuevo dátiles con carozo y nuez Mariposa.");
  assert.match(textoSinStock([]), /^Hoy sin stock/);
  for (const t of [textoSinStock([]), textoSinStock(["Pasas x 1 kg"]), mensajeSinStock("Trío")]) assert.doesNotMatch(t, /mañana|lunes|martes|hoy mismo|al recibir/i);
});

test("3 alternativas disponibles, sin el combo agotado", () => {
  const c = (slug: string, disponible = true) => ({ slug, disponible });
  const r = alternativas([c("trio"), c("a", false), c("b"), c("c"), c("d"), c("e")], "trio");
  assert.deepEqual(r.map((x) => x.slug), ["b", "c", "d"]);
});

test("/combos/alacena y los links viejos redirigen con 301 al combo de hoy", async () => {
  const reglas = (await config.redirects!()) as { source: string; destination: string; statusCode?: number }[];
  const alacena = reglas.find((r) => r.source === "/combos/alacena");
  assert.deepEqual(alacena && { d: alacena.destination, s: alacena.statusCode }, { d: "/combos/alacena-de-frutos-secos", s: 301 });
  for (const [viejo, nuevo] of Object.entries(ALIAS_COMBOS)) {
    assert.notEqual(viejo, nuevo);
    assert.ok(reglas.some((r) => r.source === `/combos/${viejo}` && r.destination === `/combos/${nuevo}`));
  }
});
