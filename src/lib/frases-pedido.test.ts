import { test } from "node:test";
import assert from "node:assert/strict";
import { sinPedidoDadoPorHecho, hayPedidoEnCharla } from "./frases-pedido";

test("23/11 Mayra: «Ya lo dejamos cargado:» sin pedido se saca", () => {
  const t = "¡Hola! Te atiende el asistente de Acopio 🤖. Ya lo dejamos cargado: el Trío trae 1 kg de mix, 1 kg de dátiles y 1 kg de pasas, $24.000. ¿De qué ciudad sos, así te digo el envío?";
  assert.equal(
    sinPedidoDadoPorHecho(t, false),
    "¡Hola! Te atiende el asistente de Acopio 🤖. El Trío trae 1 kg de mix, 1 kg de dátiles y 1 kg de pasas, $24.000. ¿De qué ciudad sos, así te digo el envío?",
  );
});

test("con pedido creado no se toca", () => {
  const t = "Listo, Ricardo. Ya lo dejamos cargado: AS-00173, $27.000.";
  assert.equal(sinPedidoDadoPorHecho(t, true), t);
});

test("las preguntas quedan", () => {
  for (const t of ["¿Te lo separamos?", "Perfecto. ¿Te lo dejo listo para el próximo reparto?", "¿Querés que te lo anotemos?"]) {
    assert.equal(sinPedidoDadoPorHecho(t, false), t);
  }
});

test("«quedó separado» y «te lo anoté» al principio y en el medio", () => {
  assert.equal(sinPedidoDadoPorHecho("Quedó separado. Te lo llevamos en el reparto de las 16.", false), "Te lo llevamos en el reparto de las 16.");
  assert.equal(sinPedidoDadoPorHecho("Genial, Martha. Te lo anoté y te paso el total: $24.000.", false), "Genial, Martha. Te paso el total: $24.000.");
});

test("hayPedidoEnCharla", () => {
  assert.equal(hayPedidoEnCharla(["hola", "Tu pedido AS-00171 está confirmado"]), true);
  assert.equal(hayPedidoEnCharla(["hola", "$24.000"]), false);
});

test("25/11 Elvira: «lo anotamos» y «ya anotamos la entrega» sin pedido se sacan", () => {
  assert.equal(
    sinPedidoDadoPorHecho("Dale, Elvira, lo anotamos. El día del reparto te lo confirmamos por acá. ¿Te queda bien la dirección de 9 de Julio 90?", false),
    "El día del reparto te lo confirmamos por acá. ¿Te queda bien la dirección de 9 de Julio 90?",
  );
  const solo = sinPedidoDadoPorHecho("Gracias, Elvira, ya anotamos la entrega en 9 de Julio 90, Galería Acuario, Dep 4 A.", false);
  assert.doesNotMatch(solo, /anotamos la entrega/);
  assert.match(solo, /¿Te lo dejo listo\?/);
  // Con pedido creado, igual que antes.
  const con = "Gracias, Elvira, ya anotamos la entrega en 9 de Julio 90. Tu pedido es el AS-00179.";
  assert.equal(sinPedidoDadoPorHecho(con, true), con);
});

test("«anotamos» dentro de una pregunta y las listas en renglones quedan", () => {
  assert.equal(sinPedidoDadoPorHecho("¿Te lo anotamos para el lunes?", false), "¿Te lo anotamos para el lunes?");
  const lista = "Te paso los precios:\n• Nuez x 1 kg: $24.500\n• Cajú x 1 kg: $25.000\nLo anotamos.\n¿Cuál te llevás?";
  assert.equal(sinPedidoDadoPorHecho(lista, false), "Te paso los precios:\n• Nuez x 1 kg: $24.500\n• Cajú x 1 kg: $25.000\n¿Cuál te llevás?");
});
