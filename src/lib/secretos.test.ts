import { test } from "node:test";
import assert from "node:assert/strict";
import { buscarEnDiff, buscarEnLinea, MARCA_IGNORAR } from "./secretos";

// Los ejemplos se arman por partes: si estuvieran escritos enteros, este mismo archivo frenaría el chequeo.
const j = (...p: string[]) => p.join("");
const agente = j("ag", "_", "Ab3".repeat(11));
const anthropic = j("sk", "-ant-", "api03-", "x".repeat(30));
const mp = j("APP", "_USR-", "1234567890", "-", "123456", "-", "a".repeat(32), "-", "1234567");
const neon = j("postgres", "ql://", "neondb_owner:", "npg_AbCdEf123", "@ep-algo.neon.tech/neondb");

test("secretos: encuentra los formatos de los proveedores que usamos", () => {
  assert.equal(buscarEnLinea(`const K = '${agente}';`, "src/x.ts", 3)[0]?.regla, "clave de agentes (x-agente-clave)");
  assert.equal(buscarEnLinea(`ANTHROPIC_API_KEY=${anthropic}`, ".env.example", 1)[0]?.regla, "Anthropic");
  assert.equal(buscarEnLinea(`token: "${mp}"`, "src/x.ts", 1)[0]?.regla, "Mercado Pago (access token)");
  assert.equal(buscarEnLinea(`DATABASE_URL=${neon}`, "README.md", 1)[0]?.regla, "URL de base con contraseña");
});

test("secretos: nunca devuelve el secreto entero", () => {
  const [h] = buscarEnLinea(agente, "a.ts", 1);
  assert.ok(h);
  assert.ok(!h.recorte.includes(agente.slice(4, 12)));
  assert.match(h.recorte, /^ag_A\*+$/);
});

test("secretos: no frena por lo que no es un secreto", () => {
  for (const ok of [
    'const clave = req.headers.get("x-agente-clave");',
    "DATABASE_URL=postgresql://usuario@localhost/acopio",
    "DATABASE_URL=postgresql://user:${PASS}@host/db",
    "DATABASE_URL=postgresql://user:<contraseña>@host/db",
    'const sha256 = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";',
    "Clave de agentes: ag_… (va en la tarea programada)",
  ]) assert.deepEqual(buscarEnLinea(ok, "src/x.ts", 1), [], ok);
  assert.deepEqual(buscarEnLinea(`"integrity": "${agente}"`, "package-lock.json", 1), []);
  assert.deepEqual(buscarEnLinea(`${agente} // ${MARCA_IGNORAR}`, "a.ts", 1), []);
});

test("secretos: en un diff solo mira lo agregado y da la línea del lado nuevo", () => {
  const diff = [
    "diff --git a/src/a.ts b/src/a.ts",
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
    "@@ -10,2 +10,3 @@",
    ` const vieja = "${agente}";`,
    `-const borrada = "${anthropic}";`,
    "+const nada = 1;",
    `+const nueva = "${anthropic}";`,
    "diff --git a/borrado.ts b/borrado.ts",
    "--- a/borrado.ts",
    "+++ /dev/null",
    "@@ -1 +0,0 @@",
    `-${agente}`,
  ].join("\n");
  const hs = buscarEnDiff(diff);
  assert.equal(hs.length, 1);
  assert.deepEqual({ ...hs[0], recorte: undefined }, { regla: "Anthropic", archivo: "src/a.ts", linea: 12, recorte: undefined });
});
