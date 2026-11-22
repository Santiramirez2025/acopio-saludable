import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { conCandado } from "./cron-candado";

test("sin candado no corre la tarea (no manda nada) y avisa por qué", async () => {
  let corridas = 0;
  const r = await conCandado("grafica-dia", async () => ++corridas, async () => false);
  assert.equal(corridas, 0);
  assert.match((r as { omitido: string }).omitido, /grafica-dia.*no se manda de nuevo/);
});

test("con candado corre una vez y devuelve lo de la tarea", async () => {
  const r = await conCandado("recompra", async () => ({ enviados: 3 }), async () => true);
  assert.deepEqual(r, { enviados: 3 });
});

test("diez llamadas simultáneas: solo la que toma el candado manda", async () => {
  let libre = true;
  const tomar = async () => { const ok = libre; libre = false; return ok; };
  let envios = 0;
  await Promise.all(Array.from({ length: 10 }, () => conCandado("grafica-dia", async () => { envios++; }, tomar)));
  assert.equal(envios, 1);
});

test("los crons que le escriben a clientes pasan por el candado", () => {
  for (const n of ["grafica-dia", "promo-semanal", "recompra", "reactivacion", "seguimiento"]) {
    const src = readFileSync(`src/app/api/cron/${n}/route.ts`, "utf8");
    assert.ok(src.includes(`conCandado("${n}"`), `${n} sin candado`);
  }
});
