import test from "node:test";
import assert from "node:assert/strict";
import { cronAutorizado } from "./cron-acceso";

const pedido = (h: Record<string, string>) => new Request("https://x.test/api/cron/radar", { headers: h });

test("con secreto: solo el Bearer correcto, el encabezado de Vercel no alcanza", () => {
  assert.equal(cronAutorizado(pedido({ authorization: "Bearer s3" }), "s3"), true);
  assert.equal(cronAutorizado(pedido({ authorization: "Bearer otro" }), "s3"), false);
  assert.equal(cronAutorizado(pedido({ "user-agent": "vercel-cron/1.0" }), "s3"), false);
  assert.equal(cronAutorizado(pedido({}), "s3"), false);
});

test("sin secreto: solo el programador de Vercel", () => {
  assert.equal(cronAutorizado(pedido({ "user-agent": "vercel-cron/1.0" }), undefined), true);
  assert.equal(cronAutorizado(pedido({ "user-agent": "curl/8.0" }), undefined), false);
  assert.equal(cronAutorizado(pedido({}), "   "), false, "un secreto en blanco cuenta como que falta");
});
