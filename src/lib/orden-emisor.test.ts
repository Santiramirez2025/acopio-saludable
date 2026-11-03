import { test } from "node:test";
import assert from "node:assert/strict";
import { leerOrden, rotuloOrden, textoConEmisor } from "./orden-emisor";

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
  const o = leerOrden(textoConEmisor("x".repeat(2000), "santiago"));
  assert.equal(o.emisor, "santiago");
  assert.equal(o.texto.length, 1000);
});
