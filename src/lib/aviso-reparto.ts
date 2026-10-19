// "Tu pedido está listo y sale en el reparto": texto si la charla está abierta, plantilla si no.

import { enviarTexto } from "./whatsapp-cloud";
import { registrarSalida, ventanaAbierta } from "./whatsapp-memoria";

export const PLANTILLA_REPARTO = "acopio_pedido_listo_v1";
const GRAPH = "https://graph.facebook.com/v21.0";

export async function avisarReparto(telefono: string, nombre: string, pedido: string, hora: string, texto: string): Promise<"texto" | "plantilla" | null> {
  if ((await ventanaAbierta(telefono).catch(() => false)) && (await enviarTexto(telefono, texto))) {
    await registrarSalida(telefono, "persona", texto).catch(() => undefined);
    return "texto";
  }
  const token = process.env.WHATSAPP_TOKEN;
  const id = process.env.WHATSAPP_PHONE_ID;
  if (!token || !id) return null;
  const p = (text: string) => ({ type: "text", text });
  const res = await fetch(`${GRAPH}/${id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: telefono, type: "template", template: { name: PLANTILLA_REPARTO, language: { code: "es_AR" }, components: [{ type: "body", parameters: [p(nombre || "¡hola"), p(pedido), p(hora)] }] } }),
  }).catch(() => null);
  if (!res?.ok) {
    console.error("reparto: plantilla rechazada", res?.status, res ? (await res.text()).slice(0, 300) : "");
    return null;
  }
  await registrarSalida(telefono, "persona", `[Plantilla pedido listo] ${pedido} · reparto ${hora}`).catch(() => undefined);
  return "plantilla";
}

export async function crearPlantillaReparto(): Promise<unknown> {
  const token = process.env.WHATSAPP_TOKEN;
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!token || !waba) return { error: "faltan WHATSAPP_TOKEN o WHATSAPP_WABA_ID" };
  const res = await fetch(`${GRAPH}/${waba}/message_templates`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: PLANTILLA_REPARTO,
      language: "es_AR",
      category: "UTILITY",
      components: [{ type: "BODY", text: "Hola {{1}}, tu pedido {{2}} de Acopio Saludable ya está listo y sale en el reparto de hoy a las {{3}}. Respondé este mensaje para confirmar que te lo llevamos.", example: { body_text: [["Ana", "AS-00012", "16 h"]] } }],
    }),
  });
  return res.json();
}
