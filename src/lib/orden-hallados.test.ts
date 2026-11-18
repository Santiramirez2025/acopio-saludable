import { test } from "node:test";
import assert from "node:assert/strict";
import { ordenarHallados } from "./orden-hallados";

const fila = (codigo: string, precio: number, encargo: boolean, i: number, s = 4) => ({ p: { codigo, precio, encargo }, i, s });

test("17/11 Gladys: a igual puntaje, la nuez en mano (TG-NUEZ) va antes que las por encargo y entra en los 6 primeros", () => {
  const filas = [
    fila("LG-NUEZMOSC-100", 2400, true, 0),
    fila("LG-981007", 7550, true, 1),
    fila("LG-981010", 8370, true, 2),
    fila("LG-981028", 6810, true, 3),
    fila("LG-978233", 30390, true, 4),
    fila("LG-007214", 1690, true, 5),
    fila("LG-978234", 56280, true, 6),
    fila("TG-NUEZ", 20500, false, 7),
  ];
  const orden = ordenarHallados(filas).map((p) => p.codigo);
  assert.equal(orden[0], "TG-NUEZ");
  assert.ok(orden.slice(0, 6).includes("TG-NUEZ"));
});

test("el puntaje sigue mandando: una por encargo con más puntos va antes que una en mano con menos", () => {
  const orden = ordenarHallados([fila("TG-PASAS", 5900, false, 0, 2), fila("LG-PASACHOC", 7600, true, 1, 4)]).map((p) => p.codigo);
  assert.deepEqual(orden, ["LG-PASACHOC", "TG-PASAS"]);
});

test("entre dos en mano y nuestras, la más barata primero (como antes)", () => {
  const orden = ordenarHallados([fila("TG-B", 9000, false, 0), fila("TG-A", 5000, false, 1)]).map((p) => p.codigo);
  assert.deepEqual(orden, ["TG-A", "TG-B"]);
});
