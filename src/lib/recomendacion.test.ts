import { test } from "node:test";
import assert from "node:assert/strict";
import { codigoDeOrigen, marcaPremio, premiosUsados, telefonoClave } from "./recomendacion";

test("recomendación: código de amigo desde el origen", () => {
  assert.equal(codigoDeOrigen("link: amigo-AB12cd34 · 2026-10-18"), "ab12cd34");
  assert.equal(codigoDeOrigen("meta (anuncio) · 2026-10-18"), null);
  assert.equal(codigoDeOrigen(null), null);
});

test("recomendación: teléfono comparable", () => {
  assert.equal(telefonoClave("+54 9 3541 51-9630"), "3541519630");
  assert.equal(telefonoClave("3541519630"), "3541519630");
});

test("recomendación: premios usados no se repiten", () => {
  const usados = premiosUsados([`web · ${marcaPremio(12)}`, null, "whatsapp"]);
  assert.ok(usados.has(12));
  assert.equal(usados.size, 1);
});
