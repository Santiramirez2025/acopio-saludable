import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fotoFeed } from "./foto-feed";

test("feed de Google: foto real recortada si existe, nunca la tarjeta ilustrada", () => {
  assert.equal(fotoFeed("TG-NUEZ", "/img/productos/prov/tg-nuez.webp"), "/img/reales/feed/real-nuez.jpg");
  assert.equal(fotoFeed("LG-MIEL-1KG", "/img/reales/real-miel.jpg"), "/img/reales/feed/real-miel.jpg");
  assert.equal(fotoFeed("TG-MIXCG-500", "/img/productos/prov/tg-mixcg-500.webp"), "/img/reales/feed/real-mix-500.jpg");
  // Tarjetas de la casa: afuera del feed.
  assert.equal(fotoFeed("LG-001202", "/img/productos/encargo/lg-001202.webp"), null);
  assert.equal(fotoFeed("HR-GLUTEN-500", "/img/productos/prov/hr-gluten-500.webp"), null);
  // Bolsa cerrada de 5 kg: no se muestra la bolsa fraccionada de 1 kg.
  assert.equal(fotoFeed("LG-DATIL-5KG", "/img/productos/prov/lg-datil.webp"), null);
  assert.equal(fotoFeed("LG-MIXSEM-10KG", "/img/productos/prov/lg-mixsem.webp"), null);
  // Fotos de envase o del proveedor: siguen igual.
  assert.equal(fotoFeed("00000010", "/img/productos/avena-instantanea.webp"), "/img/productos/avena-instantanea.webp");
  const s3 = "https://s3-sa-east-1.amazonaws.com/buho-images/x.jpg";
  assert.equal(fotoFeed("100", s3), s3);
  assert.equal(fotoFeed("100", null), null);
});

test("feed de Google: cada foto real recortada existe", () => {
  for (const c of ["TG-NUEZ", "LG-ALMNP", "LG-ALMNP-500", "TG-CAJU", "LG-DATIL", "TG-GIRASOL", "LG-GTRAD", "LG-GPROTE", "LG-MIEL", "TG-MIXCG", "TG-MIXCG-500", "TG-PASAS", "LG-MIXSEM", "TG-BANANA"]) {
    const f = fotoFeed(c, null);
    assert.ok(f, c);
    assert.ok(existsSync(`public${f}`), `${c} → ${f}`);
  }
});
