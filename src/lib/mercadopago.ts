// Mercado Pago Checkout Pro por REST (sin SDK).
// Variables: MP_ACCESS_TOKEN (obligatoria para cobrar), MP_WEBHOOK_SECRET (recomendada: valida la firma del aviso).

import { createHmac, timingSafeEqual } from "node:crypto";
import { urlSitio } from "./sitio";

const base = () => (process.env.MP_API_URL || "https://api.mercadopago.com").replace(/\/$/, "");

export const mpConfigurado = () => Boolean(process.env.MP_ACCESS_TOKEN);

async function mp<T>(ruta: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${base()}${ruta}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`Mercado Pago ${ruta.split("?")[0]}: HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export async function crearPreferencia(pedido: { token: string; numero: string; total: number; nombre: string; email: string }) {
  const sitio = urlSitio();
  const publico = sitio.startsWith("https://"); // Mercado Pago no acepta localhost para avisos ni retorno automático
  const vuelta = `${sitio}/pedido/${pedido.token}?nuevo=1`;
  return mp<{ id: string; init_point: string }>("/checkout/preferences", {
    method: "POST",
    headers: { "X-Idempotency-Key": `${pedido.token}-${Date.now()}` },
    body: JSON.stringify({
      items: [{ id: pedido.numero, title: `Pedido ${pedido.numero} en Acopio Saludable`, quantity: 1, currency_id: "ARS", unit_price: pedido.total }],
      payer: { name: pedido.nombre, email: pedido.email },
      external_reference: pedido.token,
      back_urls: { success: vuelta, pending: vuelta, failure: vuelta },
      ...(publico ? { auto_return: "approved", notification_url: `${sitio}/api/mp/webhook` } : {}),
      statement_descriptor: "ACOPIO SALUDABLE",
    }),
  });
}

export type PagoMp = { id: number; status: string; external_reference: string | null; transaction_amount: number; currency_id: string };

export function obtenerPago(id: string) {
  if (!/^\d{1,20}$/.test(id)) throw new Error("Id de pago inválido");
  return mp<PagoMp>(`/v1/payments/${id}`);
}

/**
 * Firma del aviso (header x-signature: "ts=...,v1=..."): HMAC-SHA256 de
 * "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" con el secreto del webhook.
 * Sin secreto configurado no se puede validar: igual consultamos el pago a Mercado Pago, que es la fuente de verdad.
 */
export function firmaValida(headers: Headers, dataId: string): boolean {
  const secreto = process.env.MP_WEBHOOK_SECRET;
  if (!secreto) return true;
  const partes = Object.fromEntries((headers.get("x-signature") ?? "").split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!partes.ts || !partes.v1) return false;
  const manifiesto = `id:${dataId.toLowerCase()};request-id:${headers.get("x-request-id") ?? ""};ts:${partes.ts};`;
  const esperado = createHmac("sha256", secreto).update(manifiesto).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(partes.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
