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

test("publicaciones (cada 15 min, hasta 5 min por corrida) pasa por un candado más corto que su intervalo", () => {
  const src = readFileSync("src/app/api/cron/publicaciones/route.ts", "utf8");
  assert.ok(src.includes('conCandado(\n    "publicaciones"') || src.includes('conCandado("publicaciones"'), "publicaciones sin candado");
  const ventana = Number(src.match(/VENTANA_PUBLICACIONES_MIN = (\d+)/)?.[1]);
  const duracion = Number(src.match(/maxDuration = (\d+)/)?.[1]) / 60;
  assert.ok(ventana > duracion && ventana < 15, `ventana ${ventana} min: tiene que ser > ${duracion} y < 15`);
});
