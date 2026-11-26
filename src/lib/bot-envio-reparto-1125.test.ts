import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { notaPlazoEntrega } from "./atencion-reglas";

// 24/11 (informes de Nico y del Cerrador): el bot copió los ejemplos viejos de las reglas.
// A Nancy (AS-176) y a Bea: «no se le suma nada»; a Erica: «el reparto sale todos los días»;
// a Laura: solo «no tenemos local», sin el punto de encuentro de la YPF.
// vendedor.ts carga Prisma (sin motor en los tests): se lee el texto de las reglas del archivo.
const fuente = readFileSync(join(__dirname, "vendedor.ts"), "utf8");
const prompt = fuente.slice(fuente.indexOf("function instrucciones("), fuente.indexOf("function cantidadCombo("));

test("ningún ejemplo para copiar promete «sin cargo» en Carlos Paz", () => {
  // «sin cargo» solo puede aparecer como prohibición o como respeto a lo ya prometido.
  for (const linea of prompt.split("\n").filter((l) => /sin cargo/i.test(l))) {
    const ejemplos = linea.match(/«[^»]*»/g) ?? [];
    for (const e of ejemplos) {
      if (/sin cargo/i.test(e)) {
        // Solo como frase prohibida corta («va sin cargo», «sin cargo»), nunca como ejemplo de respuesta.
        assert.ok(/nunca|no (digas|le digas)/i.test(linea) && e.length <= 40, `ejemplo con sin cargo: ${e}`);
      }
    }
  }
  assert.doesNotMatch(prompt, /te lo llevamos sin cargo/i);
  assert.doesNotMatch(prompt, /con el envío sin cargo en Carlos Paz/i);
  assert.doesNotMatch(prompt, /en Carlos Paz va sin cargo/i);
});

test("a un pedido nuevo se le suma el envío; lo viejo se respeta", () => {
  assert.match(prompt, /pedido NUEVO[^.]*lleva SIEMPRE el envío/);
  assert.match(prompt, /nunca le digas «no se le suma nada»/);
  assert.doesNotMatch(prompt, /\(con código AS\) quedan al precio que se les dijo: no se les suma nada/);
});

test("el reparto es de lunes a sábado, nunca «todos los días»", () => {
  assert.doesNotMatch(prompt, /[^«]sale todos los días/);
  assert.match(prompt, /de lunes a sábado a las 16:00/);
  const pendiente = notaPlazoEntrega("PENDIENTE_PAGO", "Villa Carlos Paz", "TRANSFERENCIA");
  assert.doesNotMatch(pendiente, /sale todos los días/);
  assert.match(pendiente, /de lunes a sábado/);
  assert.match(notaPlazoEntrega(null, null, null), /de lunes a sábado/);
});

test("si quiere retirar, se ofrece la YPF del centro (después del envío)", () => {
  // 26/11 (Teresita): quien dice que lo retira recibe las dos opciones juntas, nunca «no damos dirección».
  assert.match(prompt, /Si quiere retirarlo, pasar a buscarlo[^»]*YPF del centro/);
  assert.match(prompt, /Si dice que quiere retirarlo o pasar a buscarlo, ofrecé YA las dos opciones/);
  assert.match(prompt, /Si solo pregunta dónde estamos, sin decir que quiere ir, primero el envío a su casa/);
  assert.match(prompt, /NUNCA lo digas como negativa/);
});
