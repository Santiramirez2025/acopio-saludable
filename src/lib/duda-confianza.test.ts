import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { esDudaDeConfianza } from "./atencion-reglas";

test("duda de confianza: el caso real del 7/11 y variantes", () => {
  for (const t of [
    "El tema es la fiabilidad de la entrega! Tienen algún local?",
    "es confiable?",
    "No será una estafa no?",
    "Cómo sé que me llega si pago antes?",
    "es seguro pagar por adelantado?",
    "me da desconfianza pagar sin ver",
    "Tengo miedo de pagar y que no llegue",
    "Son reales?",
  ]) assert.equal(esDudaDeConfianza(t), true, t);
});

test("duda de confianza: lo que no es duda no se toca", () => {
  for (const t of [
    "Hola, se abona al recibir?",
    "Tienen local?",
    "seguro que me sirve, mandame 2 kilos",
    "Qué es lo que traen esos 4 kilos?",
    "Quiero la despensa",
    "Pago por transferencia",
  ]) assert.equal(esDudaDeConfianza(t), false, t);
});

test("vendedor: no promete protecciones de Mercado Pago sin verificar", () => {
  const src = readFileSync(new URL("./vendedor.ts", import.meta.url), "utf8");
  assert.ok(!/protege (tu|la) compra/.test(src), "no decir que Mercado Pago protege la compra");
  assert.ok(src.includes("- DESCONFIANZA"), "regla de desconfianza en las instrucciones");
});

test("atención: a la duda de confianza no le van los botones de pago", () => {
  const src = readFileSync(new URL("./atencion.ts", import.meta.url), "utf8");
  assert.match(src, /esDudaDeConfianza\(c\.texto\) && !nuevas\.length \? null : pedido/);
  assert.match(src, /guardarPedido: pedido\?\.camino/);
});
