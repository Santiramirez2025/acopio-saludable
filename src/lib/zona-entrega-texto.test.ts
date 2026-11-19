// Regla del 16/11 (Santiago): sin cargo solo en Villa Carlos Paz, San Antonio de Arredondo y Mayu Sumaj;
// Icho Cruz, Cuesta Blanca y Tala Huasi $ 4.000; Tanti, Cabalango, Bialet Massé y Parque Siquiman $ 5.000.
// Los textos de la tienda salen de la misma tabla que cobra el chat: si cambia un cargo, cambia el texto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cargoVecinaPorLugar, VECINAS_CON_CARGO } from "./envios/vecinas";
import { lineaCompraMinima, textoEntregaZona, textoVecinasConCargo, textoZonaSinMinimo, ZONA_SIN_CARGO } from "./minimo-zona";
import { seoCombo } from "./combo-seo";

const regla = { compraMinima: 60000, compraMinimaPropia: 20000, envioBajoMinimo: 3000, entregaPropiaActiva: true };
const sinEsp = (t: string) => t.replace(/\s/g, " ");

test("zona: cada vecina con cargo de la tienda cobra lo mismo en el chat", () => {
  for (const v of VECINAS_CON_CARGO) for (const l of v.lugares) assert.equal(cargoVecinaPorLugar(l), v.cargo, l);
  for (const l of ["Villa Carlos Paz", "San Antonio de Arredondo"]) assert.equal(cargoVecinaPorLugar(l), 0, l);
});

test("zona: el texto de entrega no promete sin cargo a Icho Cruz ni a Cuesta Blanca", () => {
  const t = sinEsp(textoEntregaZona(regla));
  assert.ok(t.startsWith(`En ${ZONA_SIN_CARGO}, sin cargo desde $ 20.000; abajo de eso, $ 3.000.`), t);
  assert.match(t, /Mayu Sumaj, Icho Cruz, Tala Huasi, Bialet Massé y Cabalango, \$ 3\.000/);
  assert.match(t, /Tanti y Cuesta Blanca, \$ 4\.000/);
  assert.doesNotMatch(t.split("Al resto de la zona")[0], /Icho Cruz|Cuesta Blanca/);
  assert.equal(sinEsp(textoVecinasConCargo()).split(";").length, 2);
});

test("zona: las frases de compra mínima dicen dónde va sin cargo", () => {
  assert.match(sinEsp(textoZonaSinMinimo(regla)), /En Villa Carlos Paz y San Antonio de Arredondo \(hasta 8 km del centro\) la entrega es sin cargo desde \$ 20\.000/);
  assert.match(sinEsp(textoZonaSinMinimo(regla)), /al resto de la zona, con un costo fijo según la localidad/);
  assert.match(sinEsp(lineaCompraMinima(regla)), /en Villa Carlos Paz, sin cargo desde \$ 20\.000/);
});

test("zona: la descripción de los combos ya no dice «sin cargo en Carlos Paz y sur de Punilla»", () => {
  const c = { nombre: "Trío de frutos secos", precio: 24000, ahorro: 3300, items: [] };
  const d = seoCombo(c, 20000).description;
  assert.doesNotMatch(d, /sur de Punilla/);
  assert.match(d, /Sin cargo en Villa Carlos Paz; resto de la zona con costo/);
  assert.doesNotMatch(seoCombo({ ...c, precio: 15000 }, 20000).description, /[Ss]in cargo/);
});
