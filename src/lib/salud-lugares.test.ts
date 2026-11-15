import { test } from "node:test";
import assert from "node:assert/strict";
import { detectar } from "./asistente";

test("una dirección en Cura Brochero, Villa Dolores o Sagrado Corazón no es una consulta de salud", () => {
  // Caso real 15/11 (audio transcripto de un cliente del Trío).
  assert.notEqual(detectar("Avenida Cura Brochero 728, San Antonio de Redondo."), "salud");
  assert.notEqual(detectar("vivo en Villa Cura Brochero"), "salud");
  assert.notEqual(detectar("soy de Villa Dolores, ¿llegan?"), "salud");
  assert.notEqual(detectar("Barrio Sagrado Corazón, calle 9 de julio 120"), "salud");
});

test("las consultas de salud de verdad se siguen detectando", () => {
  assert.equal(detectar("¿la nuez cura el colesterol?"), "salud");
  assert.equal(detectar("tengo dolores de panza, ¿qué me conviene?"), "salud");
  assert.equal(detectar("vivo en Cura Brochero y tengo diabetes, ¿qué puedo comer?"), "salud");
  assert.equal(detectar("las nueces son buenas para el corazon?"), "salud");
});
