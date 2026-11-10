// Un workflow con YAML roto no avisa: GitHub simplemente deja de correrlo (pasó con recordatorios.yml
// después de #489, por un «Authorization: Bearer» en una línea «run:» suelta). Este test lo frena antes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const DIR = new URL("../../.github/workflows/", import.meta.url);

/** Líneas «run: <comando>» en una sola línea, sin comillas, que tienen «: » adentro: YAML las rompe. */
export function runsQueRompenYaml(texto: string): string[] {
  return texto.split("\n").filter((l) => {
    const m = l.match(/^\s*(?:-\s+)?run:\s+(.+)$/);
    if (!m) return false;
    const v = m[1].trim();
    if (/^[|>]/.test(v) || /^["']/.test(v)) return false;
    return /:\s/.test(v.replace(/\s+#.*$/, ""));
  });
}

test("detecta el caso que rompió recordatorios.yml", () => {
  assert.equal(runsQueRompenYaml('      - run: curl -H "Authorization: Bearer $X" https://a').length, 1);
  assert.equal(runsQueRompenYaml("      - run: |\n          curl -H \"Authorization: Bearer $X\" https://a").length, 0);
  assert.equal(runsQueRompenYaml("        run: npm audit --omit=dev").length, 0);
});

test("ningún workflow tiene un run: de una línea que rompa el YAML", () => {
  for (const f of readdirSync(DIR).filter((n) => /\.ya?ml$/.test(n))) {
    assert.deepEqual(runsQueRompenYaml(readFileSync(new URL(f, DIR), "utf8")), [], f);
  }
});
