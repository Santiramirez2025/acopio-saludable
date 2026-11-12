import { test } from "node:test";
import assert from "node:assert/strict";
import { sinRepreguntarCiudad, yaSabemosDonde } from "./whatsapp-interactivo";

// Casos reales del 12/11 (Nico): Carlos Taborda y Martha Penfold ya habían dado calle y número.
test("con calle y número ya dados no se repregunta la ciudad ni van los botones de ciudad", () => {
  const historial = [
    { de: "acopio" as const, texto: "¡Hola! El Trío del desayuno sale $21.500. ¿Te lo dejo listo?" },
    { de: "yo" as const, texto: "Sí, Santo Cabral 212, escribanía. Pago cuando llega" },
  ];
  const r = sinRepreguntarCiudad(
    { texto: "¡Genial, Martha! Te lo dejamos armado. ¿De qué ciudad sos así te digo el envío?", opciones: ["Carlos Paz y zona", "Córdoba Capital", "Otra ciudad"] },
    historial,
    "¿a qué hora llega?",
  );
  assert.equal(r.texto, "¡Genial, Martha! Te lo dejamos armado.");
  assert.equal(r.opciones, undefined);
});

test("la dirección en el mensaje actual también cuenta", () => {
  const r = sinRepreguntarCiudad({ texto: "Perfecto, lo agendo. ¿De qué ciudad sos?" }, [], "Saavedra 50, frente a la comisaría");
  assert.equal(r.texto, "Perfecto, lo agendo.");
});

test("un «Envío a X:» ya cotizado cuenta como zona sabida; las otras opciones quedan", () => {
  const historial = [{ de: "acopio" as const, texto: "Envío a Villa Carlos Paz: sin cargo." }];
  const r = sinRepreguntarCiudad({ texto: "¿Te lo dejo listo? ¿En qué zona estás?", opciones: ["Sí, dejalo listo", "Otra ciudad"] }, historial);
  assert.equal(r.texto, "¿Te lo dejo listo?");
  assert.deepEqual(r.opciones, ["Sí, dejalo listo"]);
});

test("sin dirección ni envío cotizado la pregunta se mantiene", () => {
  const original = { texto: "El Trío sale $21.500. ¿De qué ciudad sos, así te digo el envío?", opciones: ["Carlos Paz y zona", "Córdoba Capital", "Otra ciudad"] };
  const historial = [{ de: "yo" as const, texto: "Hola, quiero 2 kilos de nuez" }];
  assert.equal(yaSabemosDonde(historial, "cuánto sale?"), false);
  assert.equal(sinRepreguntarCiudad(original, historial, "cuánto sale?"), original);
});

test("si la respuesta era solo la pregunta, no queda vacía", () => {
  const r = sinRepreguntarCiudad({ texto: "¿De qué ciudad sos?" }, [{ de: "yo" as const, texto: "Calle Belgrano 340" }]);
  assert.equal(r.texto, "¿De qué ciudad sos?");
});
