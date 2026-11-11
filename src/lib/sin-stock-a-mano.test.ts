import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularDiff, type Actual } from "./sync-diff";
import { MOTIVO_SIN_STOCK_A_MANO, esSinStockAMano, motivoAlGuardarVisible } from "./sin-stock-a-mano";

const base = { producto: "p", costo: 100, precioPublico: 200 };

test("la lista del proveedor no vuelve a la venta lo que pausamos a mano (almendra 11/11)", () => {
  const actuales: Actual[] = [
    { codigo: "LG-ALMNP", ...base, producto: "Almendras Non Pareil", estado: "SIN_STOCK", aMano: true },
    { codigo: "LG-X", ...base, estado: "SIN_STOCK" }, // la bajó la lectura del proveedor: sí vuelve
  ];
  const entrantes = [
    { codigo: "LG-ALMNP", producto: "Almendras Non Pareil", costo: 100, precioPublico: 200 },
    { codigo: "LG-X", producto: "p", costo: 100, precioPublico: 200 },
  ];
  const { items, avisos } = calcularDiff(actuales, entrantes as never, { umbralAutoPct: 10, completo: false });
  assert.equal(items.find((i) => i.codigo === "LG-ALMNP" && i.tipo === "REAPARECIDO"), undefined);
  assert.equal(items.find((i) => i.codigo === "LG-X")?.tipo, "REAPARECIDO");
  assert.ok(avisos.some((a) => a.includes("Almendras Non Pareil") && a.includes("a mano")));
});

test("un pausado a mano igual recibe el cambio de costo del proveedor", () => {
  const actuales: Actual[] = [{ codigo: "LG-ALMNP", ...base, estado: "SIN_STOCK", aMano: true }];
  const { items } = calcularDiff(actuales, [{ codigo: "LG-ALMNP", producto: "p", costo: 105, precioPublico: 200 }] as never, { umbralAutoPct: 10, completo: false });
  assert.deepEqual(items.map((i) => i.tipo), ["CAMBIO"]);
});

test("la marca: SIN_STOCK a mano sí, ACTIVO o SIN_STOCK del proveedor no", () => {
  assert.equal(esSinStockAMano({ estado: "SIN_STOCK", ocultoMotivo: MOTIVO_SIN_STOCK_A_MANO }), true);
  assert.equal(esSinStockAMano({ estado: "SIN_STOCK", ocultoMotivo: null }), false);
  assert.equal(esSinStockAMano({ estado: "ACTIVO", ocultoMotivo: MOTIVO_SIN_STOCK_A_MANO }), false);
});

test("panel: pasar a SIN_STOCK marca; volver a ACTIVO borra; guardar un SIN_STOCK del proveedor no lo marca", () => {
  assert.equal(motivoAlGuardarVisible({ estado: "ACTIVO", ocultoMotivo: null }, "SIN_STOCK"), MOTIVO_SIN_STOCK_A_MANO);
  assert.equal(motivoAlGuardarVisible({ estado: "SIN_STOCK", ocultoMotivo: MOTIVO_SIN_STOCK_A_MANO }, "SIN_STOCK"), MOTIVO_SIN_STOCK_A_MANO);
  assert.equal(motivoAlGuardarVisible({ estado: "SIN_STOCK", ocultoMotivo: MOTIVO_SIN_STOCK_A_MANO }, "ACTIVO"), null);
  assert.equal(motivoAlGuardarVisible({ estado: "SIN_STOCK", ocultoMotivo: null }, "SIN_STOCK"), null);
});
