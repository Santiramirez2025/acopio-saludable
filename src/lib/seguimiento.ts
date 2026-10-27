// Seguimiento diario (lunes a sábado, 11 h): a quien dejó un pedido armado sin cerrar hace 1 a 6 días
// se le pregunta, una sola vez por semana, si lo agendamos. Pasadas las 24 horas WhatsApp solo deja
// escribir con plantilla, así que sale con acopio_seguimiento_v1 (botones «Sí, agendalo» y «Más adelante»).
// Al final le llega a Santiago el resumen: a quién se le escribió y qué pedidos siguen sin pagar.

import { prisma } from "./prisma";
import { avisarSantiago } from "./avisos";
import { primerNombre } from "./whatsapp-interactivo";
import { pesos } from "./precios";
import { numeroPedido } from "./pedido-calculos";
import { diaDeEntrega } from "./seguimiento-dia";

export const PLANTILLA_SEGUIMIENTO = "acopio_seguimiento_v1";
const GRAPH = "https://graph.facebook.com/v21.0";
const TOPE = 25;
type Candidato = { telefono: string; nombre: string | null };

async function candidatos(): Promise<Candidato[]> {
  return prisma.$queryRaw<Candidato[]>`
    SELECT c."telefono", c."nombre" FROM "WhatsappConversacion" c
    WHERE c."baja" = false AND c."prospecto" IS NULL AND c."telefono" ~ '^[0-9]+$'
      AND c."pedido" LIKE '/carrito?p=%'
      AND (SELECT max(m."fecha") FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" AND m."de" = 'cliente')
          BETWEEN now() - interval '6 days' AND now() - interval '20 hours'
      AND NOT EXISTS (SELECT 1 FROM "WhatsappMensaje" s WHERE s."telefono" = c."telefono" AND s."id" LIKE 'seg.%' AND s."fecha" > now() - interval '7 days')
      AND NOT EXISTS (SELECT 1 FROM "Order" o WHERE right(regexp_replace(o."telefono", '[^0-9]', '', 'g'), 10) = right(c."telefono", 10) AND o."createdAt" > now() - interval '7 days')
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

async function plantilla(tel: string, nombre: string, dia: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const id = process.env.WHATSAPP_PHONE_ID;
  if (!token || !id) return false;
  const p = (text: string) => ({ type: "text", text });
  const res = await fetch(`${GRAPH}/${id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: tel, type: "template", template: { name: PLANTILLA_SEGUIMIENTO, language: { code: "es_AR" }, components: [{ type: "body", parameters: [p(nombre), p(dia)] }] } }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res?.ok) console.error("seguimiento: plantilla rechazada", res?.status, res ? (await res.text()).slice(0, 300) : "");
  return Boolean(res?.ok);
}

export async function correrSeguimiento(): Promise<{ enviados: string[]; fallidos: number; sinPagar: string[] }> {
  const dia = diaDeEntrega();
  const enviados: string[] = [];
  let fallidos = 0;
  for (const c of await candidatos()) {
    const nombre = primerNombre(c.nombre) || "¡hola";
    if (await plantilla(c.telefono, nombre, dia)) {
      const id = `seg.${c.telefono}.${Date.now()}`;
      await prisma.$executeRaw`INSERT INTO "WhatsappMensaje" ("id", "telefono", "de", "texto") VALUES (${id}, ${c.telefono}, 'bot', ${`[Seguimiento] ¿Seguís interesado? Te lo podemos llevar el ${dia}. [Botones: Sí, agendalo · Más adelante]`})`;
      enviados.push(c.nombre ?? c.telefono.slice(-4));
    } else fallidos++;
    await new Promise((r) => setTimeout(r, 400));
  }
  // Pedidos cerrados por transferencia o al recibir que siguen sin pagar después de un día.
  const pend = await prisma.$queryRaw<{ id: number; nombre: string; total: string; dias: number }[]>`
    SELECT "id", "nombre", "total"::text AS total, floor(extract(epoch FROM now() - "createdAt") / 86400)::int AS dias
    FROM "Order" WHERE "estado" = 'PENDIENTE_PAGO' AND "createdAt" < now() - interval '20 hours' AND "nombre" NOT ILIKE '%prueba%'
    ORDER BY "createdAt"`;
  const sinPagar = pend.map((o) => `${numeroPedido(o.id)} ${o.nombre} · ${pesos(Number(o.total))} · hace ${o.dias} d`);
  if (enviados.length || sinPagar.length) {
    await avisarSantiago(
      "Seguimiento del día",
      [
        enviados.length ? `📨 Seguimiento a ${enviados.length} con pedido armado sin cerrar: ${enviados.join(", ")}.` : "📨 Hoy no había pedidos armados para seguir.",
        sinPagar.length ? `💵 Pedidos sin pagar: ${sinPagar.join(" | ")}.` : "",
      ].filter(Boolean).join("\n"),
    );
  }
  return { enviados, fallidos, sinPagar };
}

export async function crearPlantillaSeguimiento(): Promise<unknown> {
  const token = process.env.WHATSAPP_TOKEN;
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!token || !waba) return { error: "faltan WHATSAPP_TOKEN o WHATSAPP_WABA_ID" };
  const res = await fetch(`${GRAPH}/${waba}/message_templates`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: PLANTILLA_SEGUIMIENTO,
      language: "es_AR",
      category: "MARKETING",
      components: [
        { type: "BODY", text: "Hola {{1}}, ¿seguís interesado en tu pedido de Acopio Saludable? Te lo guardamos y te lo podemos llevar el {{2}}. ¿Lo agendamos?", example: { body_text: [["Ana", "miércoles"]] } },
        { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Sí, agendalo" }, { type: "QUICK_REPLY", text: "Más adelante" }] },
      ],
    }),
  });
  return res.json();
}
