// Reactivación: la gente que tocó el anuncio, mandó uno o dos mensajes y no siguió. Es la mitad de las charlas.
//
// Como ya pasaron más de 24 h, solo se puede escribir con una plantilla aprobada por Meta. Se manda una sola vez,
// entre 20 h y 6 días después del último mensaje, y nunca a quien tiene carrito (de eso se ocupa el seguimiento),
// compró, es prospecto o pidió que no le escriban. Si toca «Sí, pasame precios», el vendedor sigue la charla.

import { prisma } from "./prisma";
import { primerNombre } from "./whatsapp-interactivo";

export const PLANTILLA_REACTIVACION = "acopio_reactivacion_v1";
const GRAPH = "https://graph.facebook.com/v21.0";
const TOPE = 60;

export const CUERPO_REACTIVACION =
  "Hola {{1}}, soy Santiago, de Acopio Saludable (Villa Carlos Paz). Nos escribiste por los frutos secos y creo que no llegamos a pasarte todo. " +
  "Armamos los mixes en el día y te los llevamos a tu casa: lo ves y recién ahí pagás. ¿Te paso los precios por kilo de hoy?";

type Candidato = { telefono: string; nombre: string | null };

async function candidatos(): Promise<Candidato[]> {
  return prisma.$queryRaw<Candidato[]>`
    SELECT c."telefono", c."nombre" FROM "WhatsappConversacion" c
    WHERE c."baja" = false AND c."prospecto" IS NULL AND c."telefono" ~ '^[0-9]+$' AND c."estado" <> 'persona'
      AND (c."pedido" IS NULL OR c."pedido" NOT LIKE '/carrito?p=%')
      AND (SELECT count(*) FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" AND m."de" = 'cliente') BETWEEN 1 AND 3
      AND (SELECT max(m."fecha") FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" AND m."de" = 'cliente')
          BETWEEN now() - interval '6 days' AND now() - interval '20 hours'
      AND NOT EXISTS (SELECT 1 FROM "WhatsappMensaje" s WHERE s."telefono" = c."telefono" AND (s."id" LIKE 'react.%' OR s."id" LIKE 'seg.%'))
      AND NOT EXISTS (SELECT 1 FROM "Order" o WHERE right(regexp_replace(o."telefono", '[^0-9]', '', 'g'), 10) = right(c."telefono", 10))
      -- Un agente o Santiago le escribió en las últimas 24 h: no se le suma un automático.
      AND NOT EXISTS (SELECT 1 FROM "WhatsappMensaje" h WHERE h."telefono" = c."telefono" AND h."de" = 'persona' AND h."fecha" > now() - interval '24 hours')
      -- Máximo un automático sin respuesta: si ya hubo uno (recordatorio, reactivación, seguimiento) después de su último mensaje, no va otro.
      AND NOT EXISTS (
        SELECT 1 FROM "WhatsappMensaje" a WHERE a."telefono" = c."telefono" AND a."de" = 'bot'
          AND (a."id" LIKE 'rec.%' OR a."id" LIKE 'react.%' OR a."id" LIKE 'seg.%' OR a."id" LIKE 'recompra.%')
          AND a."fecha" > (SELECT max(m."fecha") FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" AND m."de" = 'cliente')
      )
    ORDER BY c."ultimoMensaje" DESC
    LIMIT ${TOPE}`;
}

async function plantilla(tel: string, nombre: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const id = process.env.WHATSAPP_PHONE_ID;
  if (!token || !id) return false;
  const res = await fetch(`${GRAPH}/${id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: tel,
      type: "template",
      template: { name: PLANTILLA_REACTIVACION, language: { code: "es_AR" }, components: [{ type: "body", parameters: [{ type: "text", text: nombre }] }] },
    }),
  }).catch(() => null);
  if (!res?.ok) console.error("reactivación: plantilla rechazada", res?.status, res ? (await res.text()).slice(0, 300) : "");
  return Boolean(res?.ok);
}

export async function correrReactivacion(): Promise<{ enviados: string[]; fallidos: number }> {
  const enviados: string[] = [];
  let fallidos = 0;
  for (const c of await candidatos()) {
    const nombre = primerNombre(c.nombre) || "buen día";
    if (await plantilla(c.telefono, nombre)) {
      const id = `react.${c.telefono}.${Date.now()}`;
      const texto = `[Reactivación] ${CUERPO_REACTIVACION.replace("{{1}}", nombre)} [Botones: Sí, pasame precios · No, gracias]`;
      await prisma.$executeRaw`INSERT INTO "WhatsappMensaje" ("id", "telefono", "de", "texto") VALUES (${id}, ${c.telefono}, 'bot', ${texto})`;
      enviados.push(c.nombre ?? c.telefono.slice(-4));
    } else fallidos++;
    await new Promise((r) => setTimeout(r, 400));
  }
  return { enviados, fallidos };
}

export async function crearPlantillaReactivacion(): Promise<unknown> {
  const token = process.env.WHATSAPP_TOKEN;
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!token || !waba) return { error: "faltan WHATSAPP_TOKEN o WHATSAPP_WABA_ID" };
  const res = await fetch(`${GRAPH}/${waba}/message_templates`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: PLANTILLA_REACTIVACION,
      language: "es_AR",
      category: "MARKETING",
      components: [
        { type: "BODY", text: CUERPO_REACTIVACION, example: { body_text: [["Ana"]] } },
        { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Sí, pasame precios" }, { type: "QUICK_REPLY", text: "No, gracias" }] },
      ],
    }),
  });
  return { estado: res.status, cuerpo: await res.json().catch(() => null) };
}
