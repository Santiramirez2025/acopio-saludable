// Aviso cuando un cambio automático de stock apaga un combo (23/11: dátiles → Trío no disponible).
import { test } from "node:test";
import assert from "node:assert/strict";
import { avisoCombosApagados, combosQueSeApagaron, type ComboEstado } from "./combos-apagados";

const item = (codigo: string, producto: string) => ({ producto: { codigo, producto, presentacion: "x 1 kg" } });
const trio = (disponible: boolean): ComboEstado => ({
  slug: "trio-de-frutos-secos",
  nombre: "Trío de frutos secos",
  disponible,
  items: [item("LG-MIX", "Mix con cajú"), item("LG-DATIL", "Dátiles con carozo"), item("LG-PASAS", "Pasas")],
});
const alacena = (disponible: boolean): ComboEstado => ({ slug: "alacena", nombre: "Alacena", disponible, items: [item("LG-NUEZ", "Nuez")] });

test("el Trío apagado por los dátiles se avisa con el culpable", () => {
  const r = combosQueSeApagaron([trio(true), alacena(true)], [trio(false), alacena(true)], ["LG-DATIL", "LG-983530"]);
  assert.deepEqual(r, [{ slug: "trio-de-frutos-secos", nombre: "Trío de frutos secos", culpables: ["Dátiles con carozo x 1 kg"] }]);
  const t = avisoCombosApagados(r, "La Granja figura sin dátiles en su web")!;
  assert.match(t, /un combo/);
  assert.match(t, /Trío de frutos secos \(por: Dátiles con carozo x 1 kg\)/);
});

test("lo que ya estaba apagado o sigue a la venta no se avisa", () => {
  assert.deepEqual(combosQueSeApagaron([trio(false), alacena(true)], [trio(false), alacena(true)], ["LG-DATIL"]), []);
  assert.equal(avisoCombosApagados([], "x"), null);
});
