import { test } from "node:test";
import assert from "node:assert/strict";
import { aceptaComboOfrecido, preguntaDondeEstan, textoDondeEstanSinIA, textoPideDireccionSinIA } from "./whatsapp-interactivo";

const pesos = (n: number) => `$${n.toLocaleString("es-AR")}`;
const ofertaTrio = { de: "acopio", texto: "¡Hola Mary! El Trío ... $24.000, o $22.000 por transferencia. Acá lo armás: https://www.acopiosaludable.com/carrito?p=c-trio-de-frutos-secos*1" };

test("las charlas reales del 14/11 que preguntan dónde estamos", () => {
  assert.equal(preguntaDondeEstan("Donde están? Estamos en Cabalango y vamos a buscarlo"), true);
  assert.equal(preguntaDondeEstan("Dónde están uds en Carlos Paz? Voy personalmente."), true);
  assert.equal(preguntaDondeEstan("Dame tu dirección."), true);
  assert.equal(preguntaDondeEstan("¿Tienen local?"), true);
  assert.equal(preguntaDondeEstan("¿Puedo retirarlo?"), true);
  assert.equal(preguntaDondeEstan("Hola, vi el video del Trío y lo quiero"), false);
  assert.equal(preguntaDondeEstan("Calle San Martín 123, barrio Centro"), false);
});

test("sin IA, dónde estamos: sin local, sin dirección, pide calle y número", () => {
  const t = textoDondeEstanSinIA({ nombre: "Carlos", sinCargoDesde: 20000, pesos });
  assert.match(t, /^¡Hola Carlos! No tenemos local a la calle/);
  assert.match(t, /sin cargo desde \$20\.000/);
  assert.match(t, /calle, número y barrio/);
  assert.doesNotMatch(t, /perfecto|al recibir|antes de pagar|Santiago/i);
});

test("acepta el combo que le acabamos de ofrecer con link", () => {
  assert.equal(aceptaComboOfrecido("El de 22.000", [ofertaTrio]), true);
  assert.equal(aceptaComboOfrecido("Siii", [ofertaTrio]), true);
  assert.equal(aceptaComboOfrecido("Dale!", [ofertaTrio]), true);
  assert.equal(aceptaComboOfrecido("lo quiero", [ofertaTrio]), true);
  assert.equal(aceptaComboOfrecido("No, gracias", [ofertaTrio]), false);
  assert.equal(aceptaComboOfrecido("Sí, ¿pero tienen almendras y nueces también para sumar al pedido?", [ofertaTrio]), false);
  assert.equal(aceptaComboOfrecido("Siii", [{ de: "acopio", texto: "¡Hola! ¿De qué ciudad sos?" }]), false);
  assert.equal(aceptaComboOfrecido("El de 22.000", []), false);
});

test("el pedido de dirección no promete pago al recibir ni nombra a Santiago", () => {
  const t = textoPideDireccionSinIA("Mary");
  assert.match(t, /^¡Genial Mary! ¿Me pasás calle, número y barrio\?/);
  assert.doesNotMatch(t, /perfecto|al recibir|antes de pagar|Santiago/i);
});

test("15/11 (Norma, AS-90): pedir NUESTRA dirección no es dar la suya", async () => {
  const { tieneDireccion } = await import("./whatsapp-interactivo");
  for (const t of ["Pásame la dirección y voy yo a comprar.", "Me pasás la dirección. Soy de Carlos Paz", "Cuál es la dirección?", "Mandame la ubicación y voy"]) {
    assert.equal(preguntaDondeEstan(t), true, t);
    assert.equal(tieneDireccion(t), false, t);
  }
  // Las direcciones reales se siguen reconociendo.
  for (const t of ["Saavedra 165, avisame y bajo", "El Tordo 382, Barrio Villa Victoria, Tanti", "La dirección es Cartago 100", "Te paso la dirección: Los Tulipanes 197"]) {
    assert.equal(tieneDireccion(t), true, t);
    assert.equal(preguntaDondeEstan(t), false, t);
  }
});
