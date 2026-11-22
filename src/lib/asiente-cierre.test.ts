// 22/11 (Andrés, Bialet): «Ok bueno 👍» a «¿Te lo dejo listo?» no creaba el pedido y el bot repreguntaba.
import { test } from "node:test";
import assert from "node:assert/strict";
import { asienteAlCierre, aceptamosAlRecibir } from "./whatsapp-interactivo";

const CIERRE = "¿Te lo dejo listo para el próximo reparto? Lo pagás cuando lo recibís";

test("22/11: un sí escrito corto a la pregunta de cierre confirma", () => {
  for (const t of ["Ok bueno 👍", "ok", "Dale", "dale!", "Sí", "si dale", "bueno", "De una", "👍", "Sí por favor", "listo gracias", "Okey", "perfecto dale"]) {
    assert.ok(asienteAlCierre(t, CIERRE), t);
  }
  assert.ok(aceptamosAlRecibir(CIERRE));
});

test("22/11: no confirma si no le preguntamos el cierre, si duda o si es un gracias", () => {
  assert.ok(!asienteAlCierre("Ok bueno 👍", "El Trío trae mix con cajú y girasol, dátiles y pasas."));
  assert.ok(!asienteAlCierre("ok gracias", CIERRE));
  assert.ok(!asienteAlCierre("bueno, gracias", CIERRE));
  assert.ok(!asienteAlCierre("dale, ¿y cuánto sale el envío?", CIERRE));
  assert.ok(!asienteAlCierre("No por ahora", CIERRE));
  assert.ok(!asienteAlCierre("bueno lo hablo con mi marido y te aviso", CIERRE));
  assert.ok(!asienteAlCierre("ok más adelante", CIERRE));
  assert.ok(!asienteAlCierre("😢", CIERRE));
  assert.ok(!asienteAlCierre("", CIERRE));
});
