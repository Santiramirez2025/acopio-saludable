import { test } from "node:test";
import assert from "node:assert/strict";
import { fichaEditorial } from "./ficha-editorial";
import { PRODUCTOS_PROVEEDORES } from "./catalogo-proveedores";

const f = (producto: string, categoria = "Frutos secos y mix", codigo = "X") => fichaEditorial({ codigo, producto, categoria });

test("ficha editorial: lo que más se vende tiene texto propio", () => {
  assert.match(f("Castañas de cajú W4").producto, /cremoso/);
  assert.match(f("Nuez mariposa").aporta ?? "", /omega-3/);
  assert.match(f("Dátiles con carozo").uso, /nuez/);
  assert.match(f("Mix clásico").producto, /armamos/);
  assert.match(f("Mix de semillas").aporta ?? "", /omega-3/);
});

test("ficha editorial: el tipo de producto gana al ingrediente", () => {
  assert.doesNotMatch(f("Nuez moscada molida", "Especias").producto, /mitades/);
  assert.equal(f("Aceite de almendras", "Cuidado natural").aporta, null);
  assert.doesNotMatch(f("Almendras con chocolate").aporta ?? "", /vitamina E/);
  assert.equal(f("Maní con chocolate").aporta, null);
  assert.doesNotMatch(f("Lentejas de chocolate", "Repostería").producto, /Legumbre/);
});

test("ficha editorial: «por qué lo elegimos» manda en el primer bloque", () => {
  assert.equal(fichaEditorial({ codigo: "X", producto: "Mix clásico", categoria: "Frutos secos y mix", porQue: "Maní, pasas y cajú" }).producto, "Maní, pasas y cajú.");
});

test("ficha editorial: todo el catálogo tiene producto y uso, y nada promete curar", () => {
  const todo = PRODUCTOS_PROVEEDORES.map((p) => fichaEditorial(p));
  for (const [i, x] of todo.entries()) assert.ok(x.producto.length > 20 && x.uso.length > 20, PRODUCTOS_PROVEEDORES[i].codigo);
  assert.doesNotMatch(JSON.stringify(todo), /\b(cura|previene|trata|adelgaza|baja el colesterol|sana)\b/i);
});
