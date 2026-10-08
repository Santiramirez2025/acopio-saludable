// Adaptador de la API de Andreani.
// Variables: ANDREANI_USER, ANDREANI_PASSWORD, ANDREANI_CLIENTE y al menos uno de
// ANDREANI_CONTRATO_DOMICILIO / ANDREANI_CONTRATO_SUCURSAL. Opcional ANDREANI_API_URL
// (producción: https://apis.andreani.com, pruebas: https://apisqa.andreani.com).

import { medidasEstimadas } from "./bultos";
import type { PedidoCotizacion, ShippingProvider, Tarifa } from "./tipos";

let tokenCache: { token: string; vence: number } | null = null;

const base = () => (process.env.ANDREANI_API_URL || "https://apis.andreani.com").replace(/\/$/, "");

async function token(): Promise<string> {
  if (tokenCache && tokenCache.vence > Date.now()) return tokenCache.token;
  const basic = Buffer.from(`${process.env.ANDREANI_USER}:${process.env.ANDREANI_PASSWORD}`).toString("base64");
  const r = await fetch(`${base()}/login`, { headers: { Authorization: `Basic ${basic}` }, signal: AbortSignal.timeout(6000) });
  const t = r.headers.get("x-authorization-token");
  if (!r.ok || !t) throw new Error(`Andreani login: HTTP ${r.status}`);
  tokenCache = { token: t, vence: Date.now() + 12 * 60 * 60 * 1000 };
  return t;
}

async function tarifa(p: PedidoCotizacion, contrato: string, t: string): Promise<number> {
  const q = new URLSearchParams({ cpDestino: p.cpDestino, contrato, cliente: process.env.ANDREANI_CLIENTE ?? "" });
  p.bultos.forEach((b, i) => {
    q.set(`bultos[${i}][kilos]`, (b.pesoG / 1000).toFixed(2));
    q.set(`bultos[${i}][volumen]`, String(medidasEstimadas(b.pesoG).volumenCm3));
    q.set(`bultos[${i}][valorDeclarado]`, String(Math.round(p.valorDeclarado / p.bultos.length)));
  });
  const r = await fetch(`${base()}/v1/tarifas?${q}`, { headers: { "x-authorization-token": t }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`Andreani tarifas: HTTP ${r.status}`);
  const total = Number(((await r.json()) as { tarifaConIva?: { total?: string | number } }).tarifaConIva?.total);
  if (!(total > 0)) throw new Error("Andreani tarifas: respuesta sin total");
  return total;
}

export const proveedorAndreani: ShippingProvider = {
  id: "andreani",
  configurado: () =>
    Boolean(
      process.env.ANDREANI_USER &&
        process.env.ANDREANI_PASSWORD &&
        process.env.ANDREANI_CLIENTE &&
        (process.env.ANDREANI_CONTRATO_DOMICILIO || process.env.ANDREANI_CONTRATO_SUCURSAL),
    ),
  async cotizar(p: PedidoCotizacion): Promise<Tarifa[]> {
    const t = await token();
    const salida: Tarifa[] = [];
    const modalidades = [
      ["sucursal", process.env.ANDREANI_CONTRATO_SUCURSAL, "Andreani a sucursal"],
      ["domicilio", process.env.ANDREANI_CONTRATO_DOMICILIO, "Andreani a domicilio"],
    ] as const;
    for (const [modalidad, contrato, nombre] of modalidades) {
      if (!contrato) continue;
      try {
        salida.push({ id: `andreani-${modalidad}`, proveedor: "andreani", modalidad, nombre, costo: await tarifa(p, contrato, t), plazo: "Plazo a confirmar" });
      } catch (e) {
        console.error(e);
      }
    }
    return salida;
  },
};
