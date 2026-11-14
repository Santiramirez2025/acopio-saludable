import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./vendedor.ts", import.meta.url), "utf8");

test("«frutos secos» genérico: una oferta con precio de la herramienta, no una pregunta abierta (Nico 14/11)", () => {
  assert.ok(src.includes("- «FRUTOS SECOS» SIN DECIR CUÁL"));
  assert.match(src, /no le devuelvas una pregunta abierta/);
  assert.match(src, /Trío de frutos secos \(buscalo con recomendar_combo o buscar_productos y decí el precio de la herramienta/);
  assert.match(src, /mirá «FRUTOS SECOS» SIN DECIR CUÁL/);
});

test("después de «no tenemos» va una alternativa con precio, no «¿qué otra cosa buscabas?» (Nico 14/11)", () => {
  assert.ok(src.includes("- DESPUÉS DE UN «NO TENEMOS»"));
  assert.match(src, /Nunca cierres un «no tenemos» con «¿qué otra cosa buscabas\?»/);
});

test("las reglas nuevas no traen precios fijos", () => {
  for (const marca of ["- «FRUTOS SECOS» SIN DECIR CUÁL", "- DESPUÉS DE UN «NO TENEMOS»"]) {
    const i = src.indexOf(marca);
    const linea = src.slice(i, src.indexOf("\n", i));
    assert.doesNotMatch(linea, /\$\d/, marca);
  }
});
