// WhatsApp Cloud API: mandar mensajes y traducir la respuesta del vendedor a texto plano.
//
// En la web el vendedor devuelve tarjetas y botones. Acá no hay nada de eso: hay texto y links.
// Entonces lo que en la web es "botón para agregar" acá se convierte en el link al producto,
// que es lo más cerca que se puede estar de un toque para comprar.

import { urlSitio } from "./sitio";
import type { Respuesta } from "./asistente-catalogo";

const GRAPH = "https://graph.facebook.com/v21.0";

export function cloudActivo(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

async function graph(camino: string, cuerpo: unknown): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const id = process.env.WHATSAPP_PHONE_ID;
  if (!token || !id) return false;
  try {
    const res = await fetch(`${GRAPH}/${id}/${camino}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      // El cuerpo del error de Meta dice exactamente qué falta (token vencido, número sin registrar,
      // ventana de 24 hs cerrada). Sin esto, depurar un webhook es adivinar.
      console.error("whatsapp: envío rechazado", res.status, (await res.text()).slice(0, 400));
      return false;
    }
    return true;
  } catch (e) {
    console.error("whatsapp: envío falló", e);
    return false;
  }
}

/** Un mensaje de texto. Los links van sin preview para que no tape la respuesta. */
export async function enviarTexto(a: string, texto: string): Promise<boolean> {
  if (!texto.trim()) return false;
  return graph("messages", {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: a,
    type: "text",
    text: { body: texto.slice(0, 4000), preview_url: false },
  });
}

/** El tilde azul. Barato y hace que no parezca un robot que ignora. */
export async function marcarLeido(idMensaje: string): Promise<boolean> {
  return graph("messages", { messaging_product: "whatsapp", status: "read", message_id: idMensaje });
}

/**
 * La respuesta del vendedor, en texto plano para WhatsApp.
 * Se saca el link de wa.me: mandarle a alguien un link de WhatsApp dentro de WhatsApp no tiene sentido.
 */
export function paraWhatsapp(r: Respuesta): string {
  const base = urlSitio();
  const abs = (href: string) => (href.startsWith("http") ? href : `${base}${href}`);
  const partes = [r.texto.trim()];

  const productos = r.acciones?.length
    ? r.acciones.map((a) => `${a.cantidad > 1 ? `${a.cantidad} x ` : ""}${a.nombre} — ${a.precio}\n${abs(`/${a.clase === "combo" ? "combos" : "producto"}/${encodeURIComponent(a.id)}`)}`)
    : (r.fichas ?? []).slice(0, 3).map((f) => `${f.nombre}${f.detalle ? ` · ${f.detalle}` : ""} — ${f.precio}\n${abs(f.href)}`);
  if (productos.length) partes.push(productos.join("\n\n"));

  const enlaces = (r.enlaces ?? []).filter((e) => !e.href.includes("wa.me")).map((e) => `${e.texto}: ${abs(e.href)}`);
  if (enlaces.length) partes.push(enlaces.join("\n"));

  if (r.aviso) partes.push(r.aviso);
  return partes.filter(Boolean).join("\n\n");
}
