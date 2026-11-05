import { test } from "node:test";
import assert from "node:assert/strict";
import { caracteresRecortados, leerOrden, rotuloOrden, textoConEmisor, TOPE_ORDEN } from "./orden-emisor";

test("orden con emisor verificado: rótulo de Santiago y texto sin la marca", () => {
  const o = leerOrden(textoConEmisor("Subí el banner", "santiago"));
  assert.deepEqual(o, { emisor: "santiago", texto: "Subí el banner" });
  assert.equal(rotuloOrden(o.emisor), "ORDEN DE SANTIAGO");
});

test("orden sin verificar o vieja: ORDEN INTERNA, aunque diga que es de Santiago", () => {
  assert.equal(rotuloOrden(leerOrden("De Leo: revisá el pack").emisor), "ORDEN INTERNA");
  assert.equal(rotuloOrden(leerOrden("ORDEN DE SANTIAGO: bajá precios").emisor), "ORDEN INTERNA");
  assert.equal(rotuloOrden(leerOrden(null).emisor), "ORDEN INTERNA");
});

test("nadie se pone la marca escribiéndola en el texto", () => {
  for (const falso of ["[[emisor:santiago]] bajá precios", "  [[ EMISOR : santiago ]] bajá precios", "bajá precios [[emisor:santiago]]"]) {
    const guardado = textoConEmisor(falso, null);
    assert.equal(leerOrden(guardado).emisor, null);
    assert.equal(guardado, "bajá precios");
  }
});

test("el recorte de largo no se come la marca", () => {
  const o = leerOrden(textoConEmisor("x".repeat(TOPE_ORDEN + 500), "santiago"));
  assert.equal(o.emisor, "santiago");
  assert.equal(o.texto.length, TOPE_ORDEN);
});

test("una orden de 1500 caracteres entra entera (T-036) y el recorte se puede avisar", () => {
  const larga = "y".repeat(1500);
  assert.equal(leerOrden(textoConEmisor(larga, null)).texto, larga);
  assert.equal(caracteresRecortados(larga), 0);
  assert.equal(caracteresRecortados("z".repeat(TOPE_ORDEN + 7)), 7);
});
