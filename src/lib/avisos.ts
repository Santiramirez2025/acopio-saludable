// Avisos a Santiago: ventas, charlas que pasan a una persona y dudas que el vendedor no resuelve.
//
// Por WhatsApp a su celular y por mail. WhatsApp solo deja mandar texto libre si él le escribió
// al número de Acopio en las últimas 24 horas; si no, el aviso sale con una plantilla de utilidad
// (acopio_aviso_interno), que se puede mandar siempre. El mail va igual: un aviso no se pierde.

import { enviarTexto } from "./whatsapp-cloud";
import { enviarEmail, escaparHtml } from "./email";
import { leerConfig } from "./config";
import { ventanaAbierta } from "./whatsapp-memoria";

export const AVISOS_WHATSAPP = process.env.AVISOS_WHATSAPP || "5493536561265";
export const PLANTILLA_AVISO = "acopio_aviso_interno";
const GRAPH = "https://graph.facebook.com/v21.0";

/** Una línea para la plantilla: WhatsApp no acepta saltos de línea ni más de 4 espacios seguidos en un parámetro. */
export function lineaAviso(t: string): string {
  return t.replace(/\s*\n+\s*/g, " · ").replace(/\s{4,}/g, "   ").slice(0, 900);
}

async function plantillaAviso(resumen: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const id = process.env.WHATSAPP_PHONE_ID;
  if (!token || !id) return false;
  const res = await fetch(`${GRAPH}/${id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: AVISOS_WHATSAPP,
      type: "template",
      template: { name: PLANTILLA_AVISO, language: { code: "es_AR" }, components: [{ type: "body", parameters: [{ type: "text", text: lineaAviso(resumen) }] }] },
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res?.ok) console.error("aviso: plantilla rechazada", res?.status, res ? (await res.text()).slice(0, 300) : "sin respuesta");
  return Boolean(res?.ok);
}

/** Avisa a Santiago. `texto` puede tener varias líneas; `asunto` va en el mail. */
export async function avisarSantiago(asunto: string, texto: string, { mail = true }: { mail?: boolean } = {}): Promise<boolean> {
  // Red de seguridad: el mismo aviso, palabra por palabra, no se manda dos veces en 30 minutos
  // (el 26/10 llegaron 5 partes de Mercado Libre iguales porque un agente lo pidió varias veces).
  if (await yaAvisado(texto)) {
    console.log("aviso a Santiago repetido, no se manda", asunto);
    return true;
  }
  let ok = false;
  try {
    if (await ventanaAbierta(AVISOS_WHATSAPP).catch(() => false)) ok = await enviarTexto(AVISOS_WHATSAPP, texto);
    if (!ok) ok = await plantillaAviso(`${asunto} · ${texto}`);
  } catch (e) {
    console.error("aviso por WhatsApp falló", e);
  }
  const cfg = mail ? await leerConfig() : null;
  if (cfg?.emailContacto) {
    await enviarEmail({ para: cfg.emailContacto, asunto, html: `<pre style="font-family:system-ui;white-space:pre-wrap">${escaparHtml(texto)}</pre>` }).catch(() => false);
  }
  console.log("aviso a Santiago", { asunto, whatsapp: ok });
  return ok;
}

/** Alta de la plantilla de aviso (utilidad). Si ya existe, Meta lo dice y no pasa nada. */
export async function crearPlantillaAviso(): Promise<unknown> {
  const token = process.env.WHATSAPP_TOKEN;
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!token || !waba) return { error: "faltan WHATSAPP_TOKEN o WHATSAPP_WABA_ID" };
  const res = await fetch(`${GRAPH}/${waba}/message_templates`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: PLANTILLA_AVISO,
      language: "es_AR",
      category: "UTILITY",
      components: [
        {
          type: "BODY",
          text: "Aviso del panel de Acopio Saludable: {{1}}. El detalle está en el panel de pedidos y mensajes.",
          example: { body_text: [["Nueva venta AS-00005 · Patricia · Despensa de 4 kilos · $32.446 por transferencia"]] },
        },
      ],
    }),
  });
  return res.json();
}

async function yaAvisado(texto: string): Promise<boolean> {
  try {
    const { createHash } = await import("node:crypto");
    const { prisma } = await import("./prisma");
    const nombre = `aviso-${createHash("sha256").update(texto.trim()).digest("hex").slice(0, 24)}`;
    const r = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "CronCorrida" WHERE "nombre" = ${nombre} AND "fecha" > now() - interval '30 minutes'`;
    if ((r[0]?.n ?? 0) > 0) return true;
    await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${nombre}, true, '')`;
    return false;
  } catch {
    return false;
  }
}
