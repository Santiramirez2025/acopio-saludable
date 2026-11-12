// Los headers de seguridad viven en next.config.ts: si alguien los saca o agrega a la CSP una directiva
// que toca scripts/estilos/imágenes (y rompe Pixel, Analytics o Mercado Pago sin aviso), esto lo frena.
import { test } from "node:test";
import assert from "node:assert/strict";
import config, { CSP_MINIMA } from "../../next.config";

async function headersDe(ruta: string): Promise<Record<string, string>> {
  const reglas = (await config.headers!()) as { source: string; headers: { key: string; value: string }[] }[];
  const todo = reglas.find((r) => r.source === "/:path*");
  assert.ok(todo, `falta la regla de headers para ${ruta}`);
  return Object.fromEntries(todo.headers.map((h) => [h.key.toLowerCase(), h.value]));
}

test("todo el sitio lleva los headers de seguridad, CSP mínima incluida", async () => {
  const h = await headersDe("/");
  assert.equal(h["x-frame-options"], "SAMEORIGIN");
  assert.equal(h["x-content-type-options"], "nosniff");
  assert.equal(h["referrer-policy"], "strict-origin-when-cross-origin");
  assert.match(h["permissions-policy"], /camera=\(\)/);
  assert.equal(h["content-security-policy"], CSP_MINIMA);
});

test("la CSP solo trae directivas que no rompen recursos de terceros", () => {
  const directivas = CSP_MINIMA.split(";").map((d) => d.trim().split(/\s+/)[0]);
  assert.deepEqual(directivas.sort(), ["base-uri", "frame-ancestors", "object-src"]);
  assert.doesNotMatch(CSP_MINIMA, /default-src|script-src|style-src|img-src|connect-src|frame-src|form-action/);
});

test("no se anuncia el framework", () => {
  assert.equal(config.poweredByHeader, false);
});
