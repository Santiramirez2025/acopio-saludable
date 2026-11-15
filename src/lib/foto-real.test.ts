import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fotoRealProducto } from "./galeria";

test("foto real de la ficha: por código y el archivo existe", () => {
  for (const c of ["TG-NUEZ", "LG-ALMNP", "LG-ALMNP-500", "TG-CAJU", "LG-DATIL", "LG-DATIL-5KG", "TG-GIRASOL", "LG-GTRAD", "LG-MIEL", "TG-MIXCG", "TG-MIXCG-500", "TG-PASAS", "LG-MIXSEM"]) {
    const f = fotoRealProducto(c);
    assert.ok(f, c);
    assert.ok(existsSync(`public${f}`), `${c} → ${f}`);
  }
  assert.equal(fotoRealProducto("TG-GIRASOL"), "/img/reales/real-girasol.jpg");
  assert.equal(fotoRealProducto("TG-CAJUPASAS"), null);
  assert.equal(fotoRealProducto("LG-CACAO"), null);
});

test("14/11: harina de almendras o pasta de maní (por encargo) no mandan la foto de almendras ni el video del mix", async () => {
  const { fotosOportunas } = await import("./galeria");
  const r = fotosOportunas({ entrante: "¿tenés harina de almendras y pasta de maní crocante?", respuesta: "Sí, la harina de almendras sale $14.900 y la pasta $6.200. Son por encargo.", historial: [] });
  assert.equal(r.length, 0);
  const almendras = fotosOportunas({ entrante: "precio de las almendras", respuesta: "Las almendras 500 g salen $20.500", historial: [] });
  assert.ok(almendras.length > 0);
});

test("15/11: si saca un producto («mandame solo el mix») no va la foto de lo que saca", async () => {
  const { fotosOportunas } = await import("./galeria");
  const r = fotosOportunas({ entrante: "Mándame solo el mix", respuesta: "Dale, sacamos la nuez y te queda el Trío: $24.000", historial: [] });
  assert.ok(!r.some((f) => /nuez|asi-armamos/i.test(f.url)));
});

test("15/11: Malagueño y Villa San Nicolás son zona de reparto a Córdoba, no correo", async () => {
  const { zonaDeLugar } = await import("./envio-zona");
  assert.equal(zonaDeLugar("Malagueño")?.tipo, "capital");
  assert.equal(zonaDeLugar("villa san nicolas")?.tipo, "capital");
  assert.equal(zonaDeLugar("Nueva Córdoba")?.tipo, "capital");
  assert.equal(zonaDeLugar("Carlos Paz")?.tipo, "propia");
});
