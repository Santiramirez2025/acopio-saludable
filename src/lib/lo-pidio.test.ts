// x-lo-pidio: una vez por teléfono cada 24 h, con registro y sin el número en claro (Rodri, 26/11).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decidirLoPidio, detalleLoPidio, hashTelefono, motivoLoPidio } from "./lo-pidio";

test("el motivo necesita 10 letras o más; espacios no cuentan", () => {
  assert.equal(motivoLoPidio(null), null);
  assert.equal(motivoLoPidio("   corto   "), null);
  assert.equal(motivoLoPidio("          x"), null);
  assert.equal(motivoLoPidio("  Eduardo   al cadete en la puerta "), "Eduardo al cadete en la puerta");
  assert.equal(motivoLoPidio("a".repeat(500))?.length, 160);
});

test("pasa la primera vez y frena la segunda en 24 h", () => {
  assert.equal(decidirLoPidio(0), null);
  assert.match(decidirLoPidio(1) ?? "", /24 h/);
  assert.ok(decidirLoPidio(7));
});

test("el registro no guarda el teléfono y el hash es el mismo con o sin prefijo", () => {
  const d = detalleLoPidio("5493541123456", "pidió la lista en la puerta");
  assert.ok(!d.includes("3541123456"));
  assert.equal(hashTelefono("5493541123456"), hashTelefono("+54 9 3541 12-3456"));
  assert.notEqual(hashTelefono("5493541123456"), hashTelefono("5493541123457"));
  assert.ok(d.startsWith(`${hashTelefono("5493541123456")}·`));
});

test("la ruta usa el tope y ya no deja pasar x-lo-pidio solo por el largo", () => {
  const ruta = readFileSync("src/app/api/admin/whatsapp/responder/route.ts", "utf8");
  assert.ok(!/x-lo-pidio"\) \?\? ""\)\.trim\(\)\.length >= 10\) return null/.test(ruta));
  assert.match(ruta, /decidirLoPidio\(/);
  assert.match(ruta, /'lo-pidio'/);
});
