// Aviso de viaje a Córdoba (Santiago, 15/11): a quien dejó un pedido de Córdoba Capital o Malagueño trabado por el
// mínimo de $60.000 se le cuenta, UNA sola vez, que ahora lo llevamos nosotros con mínimo de $20.000.
// Pasaron más de 24 h de su último mensaje, así que va con plantilla aprobada por Meta.

import { prisma } from "./prisma";
import { primerNombre } from "./whatsapp-interactivo";
import { telefonoWa } from "./telefono";

export const PLANTILLA_VIAJE = "acopio_viaje_cordoba_v2";
export { ENVIO_PLANTILLA_VIAJE, plantillaViajeVigente } from "./viaje-cordoba-precio";
import { plantillaViajeVigente } from "./viaje-cordoba-precio";
const GRAPH = "https://graph.facebook.com/v21.0";

export const textoViaje = (nombre: string, cuando: string) =>
  `Hola ${nombre}, te escribimos de Acopio Saludable. Es por tu pedido: ${cuando} viajamos a Córdoba y te lo podemos llevar nosotros. Ahora la compra mínima es de $20.000 y el envío sale $5.000. ¿Te lo dejo listo? [Botones: Sí, armalo · Ahora no]`;

/** Manda el aviso a esos teléfonos. Nunca dos veces al mismo número ni a quien pidió la baja. */
export async function avisarViajeCordoba(telefonos: string[], cuando: string, precioZonaPaga?: number | null): Promise<{ enviados: string[]; salteados: string[]; fallidos: string[]; error?: string }> {
  if (!plantillaViajeVigente(precioZonaPaga))
    return { enviados: [], salteados: [], fallidos: telefonos, error: `La plantilla ${PLANTILLA_VIAJE} dice envío $5.000 y el vigente es otro: no se manda. Hace falta una plantilla nueva aprobada con el precio de hoy.` };
  const token = process.env.WHATSAPP_TOKEN;
  const id = process.env.WHATSAPP_PHONE_ID;
  const enviados: string[] = [];
  const salteados: string[] = [];
  const fallidos: string[] = [];
  if (!token || !id) return { enviados, salteados, fallidos: telefonos };
  for (const crudo of telefonos.slice(0, 20)) {
    const tel = telefonoWa(crudo);
    if (!tel) { fallidos.push(crudo); continue; }
    const [fila] = await prisma.$queryRaw<{ nombre: string | null; baja: boolean; ya: boolean }[]>`
      SELECT c."nombre", c."baja", EXISTS (SELECT 1 FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" AND m."id" LIKE 'viaje.%') AS ya
      FROM "WhatsappConversacion" c WHERE c."telefono" = ${tel}`;
    if (!fila || fila.baja || fila.ya) { salteados.push(tel); continue; }
    const nombre = primerNombre(fila.nombre) || "¿cómo estás?";
    const res = await fetch(`${GRAPH}/${id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to: tel, type: "template", template: { name: PLANTILLA_VIAJE, language: { code: "es_AR" }, components: [{ type: "body", parameters: [{ type: "text", text: nombre }, { type: "text", text: cuando }] }] } }),
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
    if (!res?.ok) { console.error("viaje: plantilla rechazada", res?.status, res ? (await res.text()).slice(0, 300) : ""); fallidos.push(tel); continue; }
    await prisma.$executeRaw`UPDATE "WhatsappConversacion" SET "ultimoMensaje" = now() WHERE "telefono" = ${tel}`;
    await prisma.$executeRaw`INSERT INTO "WhatsappMensaje" ("id", "telefono", "de", "texto") VALUES (${`viaje.${tel}.${Date.now()}`}, ${tel}, 'bot', ${textoViaje(nombre, cuando)})`;
    enviados.push(tel);
    await new Promise((r) => setTimeout(r, 500));
  }
  return { enviados, salteados, fallidos };
}

export async function crearPlantillaViaje(): Promise<unknown> {
  const token = process.env.WHATSAPP_TOKEN;
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!token || !waba) return { error: "faltan WHATSAPP_TOKEN o WHATSAPP_WABA_ID" };
  const res = await fetch(`${GRAPH}/${waba}/message_templates`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: PLANTILLA_VIAJE,
      language: "es_AR",
      category: "MARKETING",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, te escribimos de Acopio Saludable. Es por tu pedido: {{2}} viajamos a Córdoba y te lo podemos llevar nosotros. Ahora la compra mínima es de $20.000 y el envío sale $5.000. ¿Te lo dejo listo?",
          example: { body_text: [["Ana", "hoy lunes"]] },
        },
        { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Sí, armalo" }, { type: "QUICK_REPLY", text: "Ahora no" }] },
      ],
    }),
  });
  return res.json();
}
