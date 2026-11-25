import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planReparto, telefonosReparto, TOPE_REPARTO } from "./reparto-plan";

const T = "Hola, tu pedido sale hoy en el reparto de las 16. Son $24.000 al recibir.";

test("reparto: no le escribe a un cliente bloqueado o con baja", () => {
  const lista = [
    { telefono: "3541 11-1111", nombre: "Ana", pedido: "AS-00001", hora: "ahora", texto: T },
    { telefono: "5493541222222", nombre: "Beto", pedido: "AS-00002", hora: "ahora", texto: T },
  ];
  const p = planReparto(lista, new Set(["5493541222222"]));
  assert.deepEqual(p.enviar.map((x) => x.pedido), ["AS-00001"]);
  assert.equal(p.enviar[0].telefono, "5493541111111");
  assert.match(p.salteados["AS-00002"], /bloqueado/);
});

test("reparto: frena un monto sin $, sin pedido, sin texto y teléfonos repetidos", () => {
  const p = planReparto(
    [
      { telefono: "3541111111", pedido: "AS-1", texto: "Son 4.000 al recibir" },
      { telefono: "3541111112", texto: T },
      { telefono: "3541111113", pedido: "AS-3", texto: "  " },
      { telefono: "3541111114", pedido: "AS-4", texto: T },
      { telefono: "+54 9 3541 11-1114", pedido: "AS-5", texto: T },
      { telefono: "abc", pedido: "AS-6", texto: T },
    ],
    new Set(),
  );
  assert.deepEqual(p.enviar.map((x) => x.pedido), ["AS-4"]);
  assert.match(p.salteados["AS-1"], /signo \$/);
  assert.match(p.salteados["2"] ?? p.salteados["1112"] ?? "", /falta el pedido/);
  assert.match(p.salteados["AS-3"], /falta el texto/);
  assert.match(p.salteados["AS-5"], /repetido/);
  assert.match(p.salteados["AS-6"], /inválido/);
  assert.equal(p.enviar[0].hora, "ahora");
});

test("reparto: tope por llamada y teléfonos para consultar la baja", () => {
  const lista = Array.from({ length: TOPE_REPARTO + 5 }, (_, i) => ({ telefono: `35411${String(i).padStart(5, "0")}`, pedido: `AS-${i}`, texto: T }));
  assert.equal(planReparto(lista, new Set()).enviar.length, TOPE_REPARTO);
  assert.equal(telefonosReparto(lista).length, TOPE_REPARTO);
});

test("reparto: la ruta usa el plan (baja consultada en la base) y no la lista cruda", () => {
  const src = readFileSync("src/app/api/admin/whatsapp/prospectos/route.ts", "utf8");
  const bloque = src.slice(src.indexOf('cuerpo.accion === "reparto"'), src.indexOf('cuerpo.accion === "reprogramar"'));
  assert.match(bloque, /planReparto\(/);
  assert.match(bloque, /"baja" = true/);
  assert.doesNotMatch(bloque, /for \(const it of \(Array\.isArray\(cuerpo\.lista\)/);
});
