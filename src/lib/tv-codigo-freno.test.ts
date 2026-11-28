// 28/11 (Rodri): /api/tv/codigo es pública y cada pedido escribe una fila. Frenos por IP y global.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { _reiniciarFreno, admiteCodigoTv, admiteFreno, igualesSeguro, TV_CODIGO_MAX_GLOBAL, TV_CODIGO_MAX_POR_IP, TV_CODIGO_VENTANA_MS } from "./freno";

test("una TV real (1 código cada 9 min, reintentos cada 5 s) entra; un script desde una IP se frena", () => {
  _reiniciarFreno();
  const t0 = 1_000_000;
  for (let i = 0; i < TV_CODIGO_MAX_POR_IP; i++) assert.equal(admiteFreno("tv-codigo:1.2.3.4", TV_CODIGO_MAX_POR_IP, TV_CODIGO_VENTANA_MS, t0 + i * 5000), true);
  assert.equal(admiteFreno("tv-codigo:1.2.3.4", TV_CODIGO_MAX_POR_IP, TV_CODIGO_VENTANA_MS, t0 + 60_000), false);
  // Otra IP (la TV de la oficina) no queda afectada
  assert.equal(admiteFreno("tv-codigo:5.6.7.8", TV_CODIGO_MAX_POR_IP, TV_CODIGO_VENTANA_MS, t0 + 60_000), true);
  // Pasada la ventana, la misma IP vuelve a tener cupo
  assert.equal(admiteFreno("tv-codigo:1.2.3.4", TV_CODIGO_MAX_POR_IP, TV_CODIGO_VENTANA_MS, t0 + TV_CODIGO_VENTANA_MS + 1), true);
});

test("tope global de códigos vivos", () => {
  assert.equal(admiteCodigoTv(0), true);
  assert.equal(admiteCodigoTv(TV_CODIGO_MAX_GLOBAL - 1), true);
  assert.equal(admiteCodigoTv(TV_CODIGO_MAX_GLOBAL), false);
});

test("la ruta aplica los dos frenos antes de crear el código y no devuelve el error interno", () => {
  const src = readFileSync("src/app/api/tv/codigo/route.ts", "utf8");
  const iFreno = src.indexOf("admiteFreno(");
  const iGlobal = src.indexOf("admiteCodigoTv(");
  const iCrear = src.indexOf("crearCodigo()");
  assert.ok(iFreno > 0 && iGlobal > iFreno && iCrear > iGlobal);
  assert.doesNotMatch(src, /String\(e/);
});

test("el secreto de la TV se compara sin delatar caracteres", () => {
  const src = readFileSync("src/lib/tv.ts", "utf8");
  assert.match(src, /igualesSeguro\(secreto, c\.d\.secreto\)/);
  assert.doesNotMatch(src, /c\.d\.secreto !== secreto/);
  assert.equal(igualesSeguro("abc", "abc"), true);
  assert.equal(igualesSeguro("", ""), false);
  assert.equal(igualesSeguro("abd", "abc"), false);
});
