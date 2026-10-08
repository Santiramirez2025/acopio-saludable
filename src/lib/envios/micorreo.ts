// Adaptador de la API MiCorreo (Correo Argentino).
// Variables: MICORREO_USER, MICORREO_PASSWORD, MICORREO_CUSTOMER_ID y opcional MICORREO_API_URL
// (producción: https://api.correoargentino.com.ar/micorreo/v1, pruebas: https://apitest.correoargentino.com.ar/micorreo/v1).
// Cotiza cada bulto por separado (límite del correo: 25 kg) y suma.

import { medidasEstimadas } from "./bultos";
import type { PedidoCotizacion, ShippingProvider, Tarifa } from "./tipos";

type Rate = { deliveredType: "D" | "S"; productName: string; price: number; deliveryTimeMin?: string; deliveryTimeMax?: string };

let tokenCache: { token: string; vence: number } | null = null;

const base = () => (process.env.MICORREO_API_URL || "https://api.correoargentino.com.ar/micorreo/v1").replace(/\/$/, "");

async function token(): Promise<string> {
  if (tokenCache && tokenCache.vence > Date.now()) return tokenCache.token;
  const basic = Buffer.from(`${process.env.MICORREO_USER}:${process.env.MICORREO_PASSWORD}`).toString("base64");
  const r = await fetch(`${base()}/token`, { method: "POST", headers: { Authorization: `Basic ${basic}` }, signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(`MiCorreo token: HTTP ${r.status}`);
  const datos = (await r.json()) as { token: string };
  tokenCache = { token: datos.token, vence: Date.now() + 50 * 60 * 1000 };
  return datos.token;
}

export const proveedorMiCorreo: ShippingProvider = {
  id: "micorreo",
  configurado: () => Boolean(process.env.MICORREO_USER && process.env.MICORREO_PASSWORD && process.env.MICORREO_CUSTOMER_ID),
  async cotizar(p: PedidoCotizacion): Promise<Tarifa[]> {
    if (p.bultos.some((b) => b.excedido)) throw new Error("MiCorreo: hay un bulto de más de 25 kg");
    const t = await token();
    const porBulto = await Promise.all(
      p.bultos.map(async (b) => {
        const m = medidasEstimadas(b.pesoG);
        const r = await fetch(`${base()}/rates`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: process.env.MICORREO_CUSTOMER_ID,
            postalCodeOrigin: p.cpOrigen,
            postalCodeDestination: p.cpDestino,
            dimensions: { weight: b.pesoG, height: m.alto, width: m.ancho, length: m.largo },
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) throw new Error(`MiCorreo rates: HTTP ${r.status}`);
        return ((await r.json()) as { rates?: Rate[] }).rates ?? [];
      }),
    );
    const salida: Tarifa[] = [];
    for (const tipo of ["S", "D"] as const) {
      // Por bulto, la tarifa más barata de esa modalidad; si a algún bulto le falta, la modalidad no se ofrece.
      const elegidas = porBulto.map((rates) => rates.filter((r) => r.deliveredType === tipo && r.price > 0).sort((a, b) => a.price - b.price)[0]);
      if (elegidas.some((e) => !e)) continue;
      const max = Math.max(...elegidas.map((e) => Number(e.deliveryTimeMax ?? 0)));
      const min = Math.min(...elegidas.map((e) => Number(e.deliveryTimeMin ?? e.deliveryTimeMax ?? 0)));
      salida.push({
        id: tipo === "S" ? "micorreo-sucursal" : "micorreo-domicilio",
        proveedor: "micorreo",
        modalidad: tipo === "S" ? "sucursal" : "domicilio",
        nombre: tipo === "S" ? "Correo Argentino a sucursal" : "Correo Argentino a domicilio",
        costo: Math.round(elegidas.reduce((s, e) => s + e.price, 0) * 100) / 100,
        plazo: max > 0 ? (min > 0 && min !== max ? `${min} a ${max} días hábiles` : `${max} días hábiles`) : "Plazo a confirmar",
      });
    }
    return salida;
  },
};
