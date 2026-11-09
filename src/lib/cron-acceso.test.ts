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

test("recordatorios: con secreto solo el Bearer correcto; sin secreto sigue abierta (puente)", async () => {
  const { recordatoriosAutorizado } = await import("./cron-acceso");
  const r = (h: Record<string, string>) => new Request("https://x.test/api/whatsapp/recordatorios", { headers: h });
  assert.equal(recordatoriosAutorizado(r({ authorization: "Bearer k1" }), "k1"), true);
  assert.equal(recordatoriosAutorizado(r({ authorization: "Bearer k2" }), "k1"), false);
  assert.equal(recordatoriosAutorizado(r({ authorization: "Bearer " }), "k1"), false, "el workflow sin secreto de GitHub no pasa");
  assert.equal(recordatoriosAutorizado(r({}), "k1"), false);
  assert.equal(recordatoriosAutorizado(r({ "user-agent": "vercel-cron/1.0" }), "k1"), false);
  assert.equal(recordatoriosAutorizado(r({}), undefined), true);
  assert.equal(recordatoriosAutorizado(r({ authorization: "Bearer " }), "  "), true, "secreto en blanco = no cargado");
});

test("recordatorios: el freno por IP corta al 4.º llamado en 10 minutos", async () => {
  const { admiteFreno, _reiniciarFreno } = await import("./freno");
  const { RECORDATORIOS_MAX_POR_IP, RECORDATORIOS_VENTANA_MS } = await import("./cron-acceso");
  _reiniciarFreno();
  const t = 1_000_000;
  const vueltas = [1, 2, 3, 4].map((i) => admiteFreno("recordatorios:1.2.3.4", RECORDATORIOS_MAX_POR_IP, RECORDATORIOS_VENTANA_MS, t + i));
  assert.deepEqual(vueltas, [true, true, true, false]);
  assert.equal(admiteFreno("recordatorios:5.6.7.8", RECORDATORIOS_MAX_POR_IP, RECORDATORIOS_VENTANA_MS, t), true, "otra IP no se ve afectada");
  assert.equal(admiteFreno("recordatorios:1.2.3.4", RECORDATORIOS_MAX_POR_IP, RECORDATORIOS_VENTANA_MS, t + RECORDATORIOS_VENTANA_MS + 10), true, "pasada la ventana vuelve");
});
