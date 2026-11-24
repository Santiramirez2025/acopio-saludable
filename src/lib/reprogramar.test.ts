import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planReprogramar, telefonosDeLista, TOPE_REPROGRAMAR } from "./reprogramar";

test("reprogramar: no le escribe a un cliente bloqueado o con baja", () => {
  const lista = [
    { telefono: "3541 11-1111", nombre: "Ana", dia: "martes", pedido: "AS-00001" },
    { telefono: "5493541222222", nombre: "Beto", dia: "martes", pedido: "AS-00002" },
  ];
  const p = planReprogramar(lista, new Set(["5493541222222"]));
  assert.deepEqual(p.enviar.map((x) => x.pedido), ["AS-00001"]);
  assert.equal(p.enviar[0].telefono, "5493541111111");
  assert.match(p.salteados["AS-00002"], /bloqueado/);
});

test("reprogramar: normaliza, descarta inválidos, sin día y repetidos", () => {
  const p = planReprogramar(
    [
      { telefono: "123", dia: "martes", pedido: "A" },
      { telefono: "3541111111", dia: "", pedido: "B" },
      { telefono: "3541111111", dia: "miércoles", pedido: "C" },
      { telefono: "+54 9 3541 11-1111", dia: "miércoles", pedido: "D" },
      null,
    ],
    new Set(),
  );
  assert.deepEqual(p.enviar.map((x) => x.pedido), ["C"]);
  assert.equal(p.enviar[0].nombre, "¡hola");
  assert.ok(p.salteados.A && p.salteados.B && p.salteados.D);
});

test("reprogramar: tope de la lista y entrada que no es lista", () => {
  const muchos = Array.from({ length: 50 }, (_, i) => ({ telefono: `35410${String(i).padStart(5, "0")}`, dia: "martes", pedido: `P${i}` }));
  assert.equal(planReprogramar(muchos, new Set()).enviar.length, TOPE_REPROGRAMAR);
  assert.equal(telefonosDeLista(muchos).length, TOPE_REPROGRAMAR);
  assert.deepEqual(planReprogramar("no", new Set()).enviar, []);
});

test("la ruta reprogramar consulta la baja antes de mandar", () => {
  const src = readFileSync("src/app/api/admin/whatsapp/prospectos/route.ts", "utf8");
  const bloque = src.slice(src.indexOf('cuerpo.accion === "reprogramar"'));
  assert.ok(bloque.indexOf('"baja" = true') > 0 && bloque.indexOf('"baja" = true') < bloque.indexOf("plantillaSeguimiento("));
  assert.ok(bloque.indexOf("planReprogramar(") < bloque.indexOf("plantillaSeguimiento("));
});
