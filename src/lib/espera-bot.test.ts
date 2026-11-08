import { test } from "node:test";
import assert from "node:assert/strict";
import { sinLoEnEspera, lineaEnEspera, textoEnEspera, ALTERNATIVA_SEGURA } from "./recompra-reglas";
import { planWhatsapp } from "./whatsapp-interactivo";

// Caso real …6653 (7/11): el bot cotizó la Despensa con «¿Mercado Pago o Transferencia?» sin almendra asegurada.
test("bot: la Despensa sale del pedido y entran los 3 kilos seguros, sin perder lo demás", () => {
  const lineas = [
    { tipo: "combo" as const, id: "despensa-4-kilos", cantidad: 1 },
    { tipo: "producto" as const, id: "TG-NUEZ", cantidad: 1 },
  ];
  const cotizadas = [
    { tipo: "combo" as const, id: "despensa-4-kilos", nombre: "Despensa de 4 kilos" },
    { tipo: "producto" as const, id: "TG-NUEZ", nombre: "Nuez mariposa x 1 kg" },
  ];
  const r = sinLoEnEspera(lineas, cotizadas, true);
  assert.deepEqual(r.quitados, ["Despensa de 4 kilos"]);
  assert.deepEqual(r.lineas.map((l) => l.id), ["TG-NUEZ", "LG-DATIL", "LG-MIXSEM", "TG-PASAS"]);
});

test("bot: mix con cajú suelto también sale; mix de semillas y cajú con pasas no", () => {
  assert.equal(lineaEnEspera({ tipo: "producto", id: "TG-MIXCG", nombre: "Mix Clásico con cajú y girasol x 1 kg" }), true);
  assert.equal(lineaEnEspera({ tipo: "producto", id: "LG-MIXSEM", nombre: "Mix de semillas para el desayuno x 1 kg" }), false);
  assert.equal(lineaEnEspera({ tipo: "producto", id: "TG-CAJUPASAS", nombre: "Cajú con pasas x 1 kg" }), false);
  assert.equal(lineaEnEspera({ tipo: "combo", id: "alacena-de-frutos-secos", nombre: "Alacena" }), true);
});

test("bot: sin nada en espera, o con el interruptor apagado, el pedido no se toca", () => {
  const lineas = [{ tipo: "combo" as const, id: "despensa-4-kilos", cantidad: 2 }];
  const cot = [{ tipo: "combo" as const, id: "despensa-4-kilos", nombre: "Despensa de 4 kilos" }];
  assert.deepEqual(sinLoEnEspera(lineas, cot, false), { lineas, quitados: [] });
  const seguro = ALTERNATIVA_SEGURA.map((a) => ({ ...a }));
  const r = sinLoEnEspera(seguro, [{ tipo: "producto", id: "LG-DATIL", nombre: "Dátiles con carozo x 1 kg" }], true);
  assert.equal(r.quitados.length, 0);
  assert.equal(r.lineas, seguro);
});

test("bot: con lo cambiado, el mensaje lo explica (no el texto del modelo) y no pone botones de pago sin zona", () => {
  const pedido = {
    camino: "/carrito?p=LG-DATIL*1,LG-MIXSEM*1,TG-PASAS*1",
    renglones: ["Dátiles — $ 10.900", "Mix de semillas — $ 5.200", "Pasas — $ 5.900"],
    total: "$ 22.000",
    conTransferencia: "$ 20.200",
    falta: null,
    envio: null,
    quitados: ["Despensa de 4 kilos"],
  };
  const plan = planWhatsapp({ texto: "Te armo la Despensa, ¿Mercado Pago o Transferencia?", fotos: [{ url: "https://x/despensa.jpg", pie: "Despensa" }] }, pedido);
  assert.equal(plan.length, 1);
  const m = plan[0];
  assert.equal(m.tipo, "botones");
  if (m.tipo !== "botones") return;
  assert.ok(m.cuerpo.startsWith(textoEnEspera(["Despensa de 4 kilos"])));
  assert.ok(!m.cuerpo.includes("Te armo la Despensa"));
  assert.ok(m.botones.every((b) => b.titulo !== "Mercado Pago" && b.titulo !== "Transferencia"));
});
