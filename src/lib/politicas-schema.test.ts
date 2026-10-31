import { test } from "node:test";
import assert from "node:assert/strict";
import { politicasNegocio } from "./politicas-schema";

test("políticas: corte con la hora de config y huso de Córdoba", () => {
  const p = politicasNegocio("https://www.acopiosaludable.com", 14);
  assert.equal(p.hasShippingService.handlingTime.cutoffTime, "14:00:00-03:00");
  assert.equal(politicasNegocio("x", 9).hasShippingService.handlingTime.cutoffTime, "09:00:00-03:00");
});

test("políticas: sin tarifa de envío (varía por zona) y destino Argentina", () => {
  const s = politicasNegocio("x", 14).hasShippingService.shippingConditions as Record<string, unknown>;
  assert.equal("shippingRate" in s, false);
  assert.deepEqual(s.shippingDestination, { "@type": "DefinedRegion", addressCountry: "AR" });
});

test("políticas: devolución igual a /cambios-y-devoluciones (10 días, gratis, reintegro)", () => {
  const r = politicasNegocio("https://www.acopiosaludable.com", 14).hasMerchantReturnPolicy;
  assert.equal(r.merchantReturnDays, 10);
  assert.equal(r.returnFees, "https://schema.org/FreeReturn");
  assert.equal(r.merchantReturnLink, "https://www.acopiosaludable.com/cambios-y-devoluciones");
});
