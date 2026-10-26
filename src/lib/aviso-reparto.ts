// "Tu pedido ya está en el reparto de hoy": texto si la charla está abierta, plantilla si no.
// La plantilla nueva no promete hora: el repartidor le escribe antes para coordinar.

import { enviarTexto } from "./whatsapp-cloud";
import { registrarSalida, ventanaAbierta } from "./whatsapp-memoria";

export const PLANTILLA_REPARTO = "acopio_pedido_listo_v1";
export const PLANTILLA_REPARTO_HOY = "acopio_reparto_hoy_v1";
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
    // Sin hora («ahora»): la plantilla del reparto de hoy. Con hora fija: la vieja, que dice «a las {{3}}».
    body: JSON.stringify(
      hora === "ahora" || !/\d/.test(hora)
        ? { messaging_product: "whatsapp", to: telefono, type: "template", template: { name: PLANTILLA_REPARTO_HOY, language: { code: "es_AR" }, components: [{ type: "body", parameters: [p(nombre || "¡hola"), p(pedido)] }] } }
        : { messaging_product: "whatsapp", to: telefono, type: "template", template: { name: PLANTILLA_REPARTO, language: { code: "es_AR" }, components: [{ type: "body", parameters: [p(nombre || "¡hola"), p(pedido), p(hora)] }] } },
    ),
  }).catch(() => null);
  if (!res?.ok) {
    console.error("reparto: plantilla rechazada", res?.status, res ? (await res.text()).slice(0, 300) : "");
    return null;
  }
  await registrarSalida(telefono, "persona", `[Plantilla reparto de hoy] ${pedido}`).catch(() => undefined);
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

/** Alta de la plantilla «ya está en el reparto de hoy» (Meta la aprueba en minutos). */
export async function crearPlantillaRepartoHoy(): Promise<unknown> {
  const token = process.env.WHATSAPP_TOKEN;
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!token || !waba) return { error: "faltan WHATSAPP_TOKEN o WHATSAPP_WABA_ID" };
  const res = await fetch(`${GRAPH}/${waba}/message_templates`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: PLANTILLA_REPARTO_HOY,
      language: "es_AR",
      category: "UTILITY",
      components: [
        {
          type: "BODY",
          text: "¡Hola {{1}}! Tu pedido {{2}} de Acopio Saludable ya está en el reparto de hoy. Durante el día te va a escribir por acá el chico del reparto para coordinar la entrega. ¡Gracias por elegirnos!",
          example: { body_text: [["Ana", "AS-00012"]] },
        },
      ],
    }),
  });
  return res.json();
}
