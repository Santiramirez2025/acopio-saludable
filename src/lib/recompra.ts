// Recompra: a los 20–25 días de entregado, el cliente recibe «¿Te armo la misma despensa?» con su pedido
// anterior listo. Es la venta más barata que existe: ya nos conoce, ya probó y ya tenemos su dirección.
//
// Sale una sola vez por pedido, con plantilla (pasaron más de 24 h) y a quien no volvió a comprar desde
// entonces ni pidió la baja. Si toca «Sí, la misma», el vendedor ve en la charla el pedido anterior con sus
// códigos y la dirección, lo arma con agregar_al_pedido y solo confirma la dirección.

import { prisma } from "./prisma";
import { primerNombre } from "./whatsapp-interactivo";
import { numeroPedido } from "./pedido-calculos";
import { pesos } from "./precios";
import { textoRecompra, resumenPedido, type ItemRecompra } from "./recompra-reglas";

export const PLANTILLA_RECOMPRA = "acopio_recompra_v1";
const GRAPH = "https://graph.facebook.com/v21.0";
const TOPE = 40;

type Candidato = { id: number; nombre: string; telefono: string; calle: string; ciudad: string; total: string };

async function candidatos(): Promise<Candidato[]> {
  return prisma.$queryRaw<Candidato[]>`
    SELECT o."id", o."nombre", o."telefono", o."calle", o."ciudad", o."total"::text AS total FROM "Order" o
    JOIN LATERAL (SELECT max(e."fecha") AS entregado FROM "OrderEvent" e WHERE e."orderId" = o."id" AND e."estado" = 'ENTREGADO') ev ON true
    WHERE o."estado" = 'ENTREGADO' AND o."nombre" NOT ILIKE '%prueba%'
      AND coalesce(ev.entregado, o."updatedAt") BETWEEN now() - interval '25 days' AND now() - interval '20 days'
      -- No volvió a comprar desde ese pedido.
      AND NOT EXISTS (SELECT 1 FROM "Order" n WHERE n."id" <> o."id" AND n."createdAt" > o."createdAt" AND n."estado" <> 'CANCELADO'
                      AND right(regexp_replace(n."telefono", '[^0-9]', '', 'g'), 10) = right(regexp_replace(o."telefono", '[^0-9]', '', 'g'), 10))
      -- Ni se le ofreció ya, ni pidió la baja.
      AND NOT EXISTS (SELECT 1 FROM "WhatsappMensaje" m WHERE m."id" LIKE 'recompra.%' AND m."texto" LIKE '%(id ' || o."id"::text || ')%'
                      AND right(m."telefono", 10) = right(regexp_replace(o."telefono", '[^0-9]', '', 'g'), 10))
      AND NOT EXISTS (SELECT 1 FROM "WhatsappConversacion" c WHERE c."baja" AND right(c."telefono", 10) = right(regexp_replace(o."telefono", '[^0-9]', '', 'g'), 10))
    ORDER BY o."id"
    LIMIT ${TOPE}`;
}

function telefonoWhatsapp(t: string): string | null {
  let d = t.replace(/\D/g, "");
  if (d.startsWith("549") && d.length === 13) return d;
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  d = d.replace(/^(\d{2,4})15(\d{6,8})$/, "$1$2");
  return d.length === 10 ? `549${d}` : null;
}

async function plantilla(tel: string, nombre: string, resumen: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const id = process.env.WHATSAPP_PHONE_ID;
  if (!token || !id) return false;
  const p = (text: string) => ({ type: "text", text });
  const res = await fetch(`${GRAPH}/${id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: tel, type: "template", template: { name: PLANTILLA_RECOMPRA, language: { code: "es_AR" }, components: [{ type: "body", parameters: [p(nombre), p(resumen)] }] } }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res?.ok) console.error("recompra: plantilla rechazada", res?.status, res ? (await res.text()).slice(0, 300) : "");
  return Boolean(res?.ok);
}

export async function correrRecompra(): Promise<{ enviados: string[]; fallidos: number }> {
  const enviados: string[] = [];
  let fallidos = 0;
  for (const o of await candidatos()) {
    const tel = telefonoWhatsapp(o.telefono);
    if (!tel) { fallidos++; continue; }
    const items = await prisma.$queryRaw<ItemRecompra[]>`SELECT "codigo", "producto", "presentacion", "cantidad", "comboSlug" FROM "OrderItem" WHERE "orderId" = ${o.id} ORDER BY "id"`;
    if (!items.length) continue;
    const nombre = primerNombre(o.nombre) || "¿cómo estás?";
    if (await plantilla(tel, nombre, resumenPedido(items))) {
      const texto = textoRecompra({ numero: numeroPedido(o.id), id: o.id, nombre, items, direccion: `${o.calle}, ${o.ciudad}`, total: pesos(Number(o.total)) });
      await prisma.$executeRaw`
        INSERT INTO "WhatsappConversacion" ("telefono", "nombre", "ultimoMensaje") VALUES (${tel}, ${o.nombre}, now())
        ON CONFLICT ("telefono") DO UPDATE SET "ultimoMensaje" = now()`;
      await prisma.$executeRaw`INSERT INTO "WhatsappMensaje" ("id", "telefono", "de", "texto") VALUES (${`recompra.${o.id}.${Date.now()}`}, ${tel}, 'bot', ${texto})`;
      enviados.push(`${o.nombre} (${numeroPedido(o.id)})`);
    } else fallidos++;
    await new Promise((r) => setTimeout(r, 500));
  }
  return { enviados, fallidos };
}

export async function crearPlantillaRecompra(): Promise<unknown> {
  const token = process.env.WHATSAPP_TOKEN;
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!token || !waba) return { error: "faltan WHATSAPP_TOKEN o WHATSAPP_WABA_ID" };
  const res = await fetch(`${GRAPH}/${waba}/message_templates`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: PLANTILLA_RECOMPRA,
      language: "es_AR",
      category: "MARKETING",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, soy Santiago, de Acopio Saludable. Hace unas semanas te llevamos {{2}}. ¿Te armo lo mismo para este mes? Te lo llevamos a tu casa y pagás al recibir.",
          example: { body_text: [["Ana", "la Despensa de 4 kilos"]] },
        },
        { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Sí, lo mismo" }, { type: "QUICK_REPLY", text: "Quiero cambiar algo" }, { type: "QUICK_REPLY", text: "Ahora no" }] },
      ],
    }),
  });
  return res.json();
}
