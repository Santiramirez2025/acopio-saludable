// Webhook de Messenger e Instagram Direct: el mismo vendedor que en WhatsApp.
//
// Igual que el de WhatsApp: se verifica la firma con el app secret, se contesta 200 enseguida
// y el trabajo va en after(). Los mensajes que manda la propia página (is_echo) se ignoran:
// si no, el bot se contestaría a sí mismo.

import { after, NextResponse } from "next/server";
import crypto from "node:crypto";
import { atender, cola } from "@/lib/atencion";
import { metaActivo, nombreMeta, paginaMeta } from "@/lib/meta-mensajes";
import { comentariosDe } from "@/lib/comentarios";
import { atenderComentarios } from "@/lib/comentarios-atender";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function firmaValida(crudo: string, cabecera: string | null): boolean {
  const secreto = process.env.WHATSAPP_APP_SECRET;
  if (!secreto || !cabecera?.startsWith("sha256=")) return false;
  const esperada = crypto.createHmac("sha256", secreto).update(crudo).digest();
  const recibida = Buffer.from(cabecera.slice(7), "hex");
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida);
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN;
  if (esperado && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === esperado) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new Response("no", { status: 403 });
}

type Referral = { ref?: string; ad_id?: string; source?: string; type?: string; ads_context_data?: { ad_title?: string; post_id?: string } };
type Evento = {
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: { mid?: string; text?: string; is_echo?: boolean; quick_reply?: { payload?: string }; attachments?: { type?: string }[]; referral?: Referral };
  postback?: { mid?: string; title?: string; payload?: string; referral?: Referral };
  referral?: Referral;
};

export async function POST(req: Request) {
  const crudo = await req.text();
  if (!firmaValida(crudo, req.headers.get("x-hub-signature-256"))) {
    console.error("meta: firma inválida");
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }
  let cuerpo: { object?: string; entry?: { messaging?: Evento[]; changes?: { field?: string; value?: Record<string, unknown> }[] }[] };
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return NextResponse.json({ ok: true });
  }
  const prefijo = cuerpo.object === "instagram" ? "ig." : cuerpo.object === "page" ? "fb." : null;
  const eventos = (cuerpo.entry ?? []).flatMap((e) => e.messaging ?? []);
  console.log("meta: webhook recibido", { objeto: cuerpo.object, eventos: eventos.length });
  if (!prefijo) return NextResponse.json({ ok: true });
  const comentarios = comentariosDe(cuerpo.object, cuerpo.entry ?? []);

  after(async () => {
    if (comentarios.length && metaActivo()) await atenderComentarios(comentarios).catch((e) => console.error("meta: comentarios falló", e));
    if (!metaActivo()) {
      console.error("meta: falta META_TOKEN, no se contesta");
      return;
    }
    const pagina = await paginaMeta();
    for (const ev of eventos) {
      const de = ev.sender?.id;
      if (!de || ev.message?.is_echo) continue;
      // En Instagram, los mensajes que manda la cuenta también llegan con el id de la cuenta como remitente.
      if (de === pagina?.id || de === pagina?.instagram) continue;
      const clave = `${prefijo}${de}`;
      const id = ev.message?.mid ?? ev.postback?.mid ?? `${clave}.${Date.now()}`;
      const texto = ev.message ? (ev.message.text ?? (ev.message.attachments?.length ? null : "")) : ev.postback ? (ev.postback.title ?? ev.postback.payload ?? "") : null;
      if (texto === null && !ev.message) continue; // leído, entregado, reacción: nada que contestar
      const ref = ev.message?.referral ?? ev.postback?.referral ?? ev.referral;
      try {
        await atender({
          clave,
          idMensaje: id,
          nombre: await nombreMeta(clave),
          texto,
          tipo: ev.message?.attachments?.[0]?.type ?? (ev.postback ? "postback" : "text"),
          anuncio: ref?.ad_id ? { id: ref.ad_id, titulo: ref.ads_context_data?.ad_title ?? null, texto: null, ctwaClid: null } : null,
        });
      } catch (e) {
        console.error("meta: atender falló", cola(clave), e);
      }
    }
  });
  return NextResponse.json({ ok: true });
}
