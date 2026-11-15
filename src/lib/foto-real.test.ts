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
