// Manda el comprobante de pago por el WhatsApp del negocio. Si la charla está abierta (el cliente
// escribió en las últimas 24 horas) va como texto; si no, con la plantilla de utilidad
// acopio_comprobante_pago_v1, que Meta deja mandar siempre.

import type { Order } from "@prisma/client";
import { enviarTexto } from "./whatsapp-cloud";
import { registrarSalida, ventanaAbierta } from "./whatsapp-memoria";
import { numeroPedido } from "./pedido-calculos";
import { prisma } from "./prisma";
import { pesos } from "./precios";
import { urlSitio } from "./sitio";
import { telefonoWa } from "./telefono";

export const PLANTILLA_COMPROBANTE = "acopio_comprobante_pago_v1";
const GRAPH = "https://graph.facebook.com/v21.0";

export const urlComprobante = (token: string) => `${urlSitio()}/pedido/${token}/comprobante`;

function telefonoDe(p: Order): string | null {
  const d = p.telefono.replace(/\D/g, "");
  return telefonoWa(d);
}

function primerNombre(p: Order): string {
  const n = p.nombre.trim().split(/\s+/)[0] ?? "";
  return n && !/cliente/i.test(n) ? n : "";
}

async function plantilla(tel: string, p: Order, url: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const id = process.env.WHATSAPP_PHONE_ID;
  if (!token || !id) return false;
  const param = (text: string) => ({ type: "text", text });
  const res = await fetch(`${GRAPH}/${id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: tel,
      type: "template",
      template: { name: PLANTILLA_COMPROBANTE, language: { code: "es_AR" }, components: [{ type: "body", parameters: [param(primerNombre(p) || "¡hola"), param(numeroPedido(p.id)), param(pesos(Number(p.total))), param(url)] }] },
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res?.ok) console.error("comprobante: plantilla rechazada", res?.status, res ? (await res.text()).slice(0, 300) : "sin respuesta");
  return Boolean(res?.ok);
}

/** Devuelve cómo salió: "texto", "plantilla" o null si no se pudo. */
export async function enviarComprobante(p: Order, forzar = false): Promise<"texto" | "plantilla" | null> {
  const tel = telefonoDe(p);
  if (!tel) return null;
  // El aviso automático sale una vez: si el pago se confirma dos veces (webhook y panel), no se repite.
  if (!forzar) {
    const ya = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "WhatsappMensaje" WHERE "de" <> 'cliente' AND "texto" LIKE ${`%pago de tu pedido ${numeroPedido(p.id)}%`} AND "fecha" > now() - interval '2 days'`;
    if (Number(ya[0]?.n ?? 0) > 0) return "texto";
  }
  const url = urlComprobante(p.token);
  const nombre = primerNombre(p);
  const texto = `¡Gracias${nombre ? `, ${nombre}` : ""}! Recibimos el pago de tu pedido ${numeroPedido(p.id)} por ${pesos(Number(p.total))} ✅\n\nAcá tenés tu comprobante, guardalo en el celu: ${url}`;
  let via: "texto" | "plantilla" | null = null;
  if ((await ventanaAbierta(tel).catch(() => false)) && (await enviarTexto(tel, texto))) via = "texto";
  else if (await plantilla(tel, p, url)) via = "plantilla";
  if (via) await registrarSalida(tel, "persona", texto).catch(() => undefined);
  return via;
}

/** Alta de la plantilla (utilidad). Si ya existe, Meta lo dice y no pasa nada. */
export async function crearPlantillaComprobante(): Promise<unknown> {
  const token = process.env.WHATSAPP_TOKEN;
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!token || !waba) return { error: "faltan WHATSAPP_TOKEN o WHATSAPP_WABA_ID" };
  const res = await fetch(`${GRAPH}/${waba}/message_templates`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: PLANTILLA_COMPROBANTE,
      language: "es_AR",
      category: "UTILITY",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, recibimos el pago de tu pedido {{2}} de Acopio Saludable por {{3}}. Tu comprobante: {{4}} . ¡Gracias por tu compra!",
          example: { body_text: [["Ana", "AS-00012", "$ 35.232", "https://www.acopiosaludable.com/pedido/abc/comprobante"]] },
        },
      ],
    }),
  });
  return res.json();
}
