import { test } from "node:test";
import assert from "node:assert/strict";
import { rechazaContacto } from "./rechaza-contacto";

test("Vilma (24/11) y María Laura (AS-172): después de un no, ningún seguimiento automático", () => {
  assert.equal(rechazaContacto("Por ahora no quiero nada"), true);
  assert.equal(rechazaContacto("No"), true);
  assert.equal(rechazaContacto("No."), true);
  assert.equal(rechazaContacto("No gracias"), true);
  assert.equal(rechazaContacto("No hice ningún pedido"), true);
  assert.equal(rechazaContacto("Más adelante"), true);
  assert.equal(rechazaContacto("no me interesa, gracias"), true);
  assert.equal(rechazaContacto("Gracias pero no quiero, es caro el envío"), true);
  assert.equal(rechazaContacto("dame de baja"), true);
});

test("lo que no es un no sigue recibiendo el seguimiento", () => {
  assert.equal(rechazaContacto(null), false);
  assert.equal(rechazaContacto(""), false);
  assert.equal(rechazaContacto("Quiero el Trío"), false);
  assert.equal(rechazaContacto("¿No tienen el mix sin maní?"), false);
  assert.equal(rechazaContacto("Soy de Carlos Paz, barrio Colinas"), false);
  assert.equal(rechazaContacto("¿Cuánto sale el envío?"), false);
  assert.equal(rechazaContacto("Nora"), false);
});
