import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { decidirAgente, hashEdge, leerClavesAgentes } from "./agente-permisos";

const hash = "a".repeat(64);
const claves = leerClavesAgentes(JSON.stringify([{ agente: "seguridad", sha256: hash, leer: ["/salud", "/agentes"], escribir: ["/agentes/orden"] }]));
const d = (metodo: string, ruta: string) => decidirAgente(claves, hash, metodo, ruta)?.permitido;

test("una clave que no es de agente la decide la ruta, como siempre", () => {
  assert.equal(decidirAgente(claves, "b".repeat(64), "POST", "/api/admin/pedidos"), null);
  assert.equal(decidirAgente([], hash, "GET", "/api/admin/salud"), null);
});

test("lectura y escritura se autorizan por separado", () => {
  assert.equal(d("GET", "/api/admin/salud"), true);
  assert.equal(d("HEAD", "/api/admin/salud"), true);
  assert.equal(d("POST", "/api/admin/salud"), false);
  assert.equal(d("POST", "/api/admin/agentes/orden"), true);
  assert.equal(d("POST", "/api/admin/agentes"), false);
  assert.equal(d("DELETE", "/api/admin/salud"), false);
});

test("la regla cubre subrutas pero no nombres parecidos ni otras rutas", () => {
  assert.equal(d("GET", "/api/admin/agentes/datos"), true);
  assert.equal(d("GET", "/api/admin/agentes-otra"), false);
  assert.equal(d("GET", "/api/admin/pedidos"), false);
  assert.equal(d("GET", "/api/admin/salud/"), true);
});

test("una ruta rara se niega aunque parezca permitida", () => {
  for (const r of ["/api/admin/salud/../pedidos", "/api/admin/%73alud", "/api/admin//salud", "/api/admin/salud\\x", "/api/adminotra/salud", "/otra"]) assert.equal(d("GET", r), false, r);
});

test("el comodín solo vale para el método donde está", () => {
  const c = leerClavesAgentes(JSON.stringify([{ agente: "x", sha256: hash, leer: ["*"], escribir: [] }]));
  assert.equal(decidirAgente(c, hash, "GET", "/api/admin/pedidos/4")?.permitido, true);
  assert.equal(decidirAgente(c, hash, "POST", "/api/admin/pedidos/4")?.permitido, false);
});

test("una configuración rota no autoriza a nadie", () => {
  const error = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(leerClavesAgentes("{roto"), []);
    assert.deepEqual(leerClavesAgentes('{"agente":"x"}'), []);
  } finally {
    console.error = error;
  }
  assert.deepEqual(leerClavesAgentes(undefined), []);
  assert.deepEqual(leerClavesAgentes(JSON.stringify([{ agente: "x", sha256: "corto", leer: ["*"] }, null])), []);
});

test("el hash de Edge es igual al de hashClave (sha256 de la clave sin espacios)", async () => {
  assert.equal(await hashEdge(" ag_prueba "), createHash("sha256").update("ag_prueba").digest("hex"));
});
