import { test } from "node:test";
import assert from "node:assert/strict";
import { claveBase, cruzarPromos } from "./promo-proveedor";

test("promos de la semana: cruza por clave del proveedor y deja afuera los 2x1 y lo no disponible", () => {
  const cajas = [
    { codigo: "9-981-030", nombre: "PISTACHO CON CASCARA X 1 KG promo semanal", precio: 31200, disponible: true },
    { codigo: "0-935-001", nombre: "Aceite de Oliva Pisi x 250 cc promo semanal", precio: 7141, disponible: true },
    { codigo: "9-916-407", nombre: "Promo 2 x 1 EDULCORANTE promo semanal", precio: 7957, disponible: true },
    { codigo: "9-001-218", nombre: "Garbanzos x 5 kg promo semanal", precio: 5250, disponible: false },
    { codigo: "0-980-027", nombre: "DATILES CON CAROZO X 1 KG", precio: 8066, disponible: true },
  ];
  const nuestros = [
    { codigo: "LG-PISTACHO", codigoProveedor: "981-030" },
    { codigo: "LG-935001", codigoProveedor: "935-001" },
    { codigo: "LG-916407", codigoProveedor: "916-407" },
    { codigo: "LG-GARBANZO-1KG", codigoProveedor: "001-218" },
    { codigo: "LG-DATIL", codigoProveedor: "980-028" },
  ];
  assert.deepEqual(cruzarPromos(cajas, nuestros), [
    { codigo: "LG-PISTACHO", costoPromo: 31200 },
    { codigo: "LG-935001", costoPromo: 7141 },
  ]);
  assert.equal(claveBase("0-983-550-*"), "983-550");
});
