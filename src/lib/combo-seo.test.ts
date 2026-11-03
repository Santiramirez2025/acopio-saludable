import { test } from "node:test";
import assert from "node:assert/strict";
import { altCombo, pesoCombo, seoCombo } from "./combo-seo";
import { contenidoNeto } from "./precios";

const it = (producto: string, contenido: number | null, unidad: string | null = "g") => ({ producto: { producto, contenido, unidad }, cantidad: 1 });
const despensa = { nombre: "Despensa de 4 kilos", precio: 35000, ahorro: 6900, items: [it("Dátiles Deglet Nour con carozo (Argelia)", 1000), it("Mix de semillas para el desayuno", 1000), it("Mix Clásico con cajú y girasol", 1000), it("Pasas de uva negras sin semilla", 1000)] };

test("combo: precio y peso en título y descripción, sin repetir kilos ni espacio duro", () => {
  const s = seoCombo(despensa, 20000);
  assert.equal(s.title, "Combo Despensa de 4 kilos: $ 35.000");
  assert.match(s.description, /4 kg por \$ 35\.000, ahorrás \$ 6\.900\./);
  assert.match(s.description, /sin cargo en Carlos Paz/);
  assert.ok(s.description.length <= 155, String(s.description.length));
  assert.equal(/ /.test(s.title + s.description), false);
});

test("combo: abajo del mínimo no promete entrega sin cargo", () => {
  assert.doesNotMatch(seoCombo({ ...despensa, precio: 15000 }, 20000).description, /sin cargo/);
});

test("combo: si los productos no entran se corta la lista, nunca el precio", () => {
  const s = seoCombo({ ...despensa, items: Array.from({ length: 12 }, (_, i) => it(`Producto de nombre bastante largo ${i}`, 500)) }, 20000);
  assert.match(s.description, /y más\./);
  assert.match(s.description, /Envíos al país\.$/);
  assert.ok(s.description.length <= 155);
});

test("combo: peso solo si todo se vende por peso", () => {
  assert.equal(pesoCombo(despensa.items), 4000);
  assert.equal(pesoCombo([it("Alfajores", null), it("Nuez", 500)]), 0);
});

test("combo: «x 6 unidades» cargado como 6 g no es un peso", () => {
  assert.equal(contenidoNeto(6, "g", "x 6 unidades"), null);
  assert.equal(contenidoNeto(200, "g", "x 200 g"), 200);
  assert.equal(contenidoNeto(330, "g", "x 6 unidades"), 330);
  assert.equal(contenidoNeto(6, "ml", "x 6 unidades"), 6);
});

test("combo: alt nombra lo que se ve", () => {
  assert.equal(altCombo({ nombre: "Prueba", items: [it("Nuez (light)", 1), it("Pasas x 500 g", 1)] }), "Combo Prueba: Nuez, Pasas");
});
