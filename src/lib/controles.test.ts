import test from "node:test";
import assert from "node:assert/strict";
import { secretosPresentes } from "./controles";

test("dice sí o no y jamás devuelve el valor", () => {
  const r = secretosPresentes({ CRON_SECRET: "valor-que-no-debe-salir", MP_WEBHOOK_SECRET: "  ", OTRA: "x" });
  assert.equal(r.CRON_SECRET, true);
  assert.equal(r.MP_WEBHOOK_SECRET, false, "vacío o con espacios cuenta como que falta");
  assert.equal(r.WHATSAPP_APP_SECRET, false);
  assert.ok(!JSON.stringify(r).includes("valor-que-no-debe-salir"));
  assert.ok(!("OTRA" in r), "solo la lista fija");
});
