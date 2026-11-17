import { test } from "node:test";
import assert from "node:assert/strict";
import { fichaViva } from "./ficha-viva";
import { RECETAS } from "./recetas";
import { PRODUCTOS_PROVEEDORES } from "./catalogo-proveedores";

const f = (producto: string, categoria = "Almacen") => fichaViva({ producto, categoria });

test("ficha viva: el tipo de producto gana al ingrediente", () => {
  assert.match(f("Yerba mate orgánica", "Café, yerba e infusiones").dato, /mate/);
  assert.match(f("Aceite de almendra", "Cuidado natural").tips.join(" "), /uso externo/);
  assert.match(f("Harina de almendras", "Harinas y Féculas").dato, /harina/);
  assert.match(f("Pasta de maní natural").dato, /pasta de maní/);
  assert.match(f("Nuez mariposa", "Frutos secos y mix").dato, /omega-3/);
  assert.match(f("Nuez moscada molida", "Especias").dato, /especias/i);
  assert.match(f("Ambay", "Café, yerba e infusiones").dato, /infusión/);
  assert.match(f("Omega 3 puro", "Suplementos").dato, /suplemento/i);
});

test("ficha viva: todo el catálogo tiene ficha y las recetas que nombra existen", () => {
  const slugs = new Set(RECETAS.map((r) => r.slug));
  for (const p of PRODUCTOS_PROVEEDORES) {
    const x = fichaViva(p);
    assert.ok(x.dato && x.tips.length >= 2 && x.idea.como, p.codigo);
    for (const r of x.recetas ?? []) assert.ok(slugs.has(r), `${p.codigo}: receta ${r}`);
  }
});

test("ficha viva: nada promete curar", () => {
  const todo = JSON.stringify(PRODUCTOS_PROVEEDORES.map((p) => fichaViva(p)));
  assert.doesNotMatch(todo, /\b(cura|previene|trata|adelgaza|baja el colesterol|sana)\b/i);
});
