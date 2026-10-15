// WhatsApp Cloud API: mandar mensajes y traducir la respuesta del vendedor a texto plano.
//
// En la web el vendedor devuelve tarjetas y botones. Acá no hay nada de eso: hay texto y links.
// Entonces lo que en la web es "botón para agregar" acá se convierte en el link al producto,
// que es lo más cerca que se puede estar de un toque para comprar.

import { urlSitio } from "./sitio";
import { enlacePedido } from "./pedido-enlace";
import type { Respuesta } from "./asistente-catalogo";

const GRAPH = "https://graph.facebook.com/v21.0";

export function cloudActivo(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

type Resultado = { ok: boolean; codigo?: number };

async function graph(camino: string, cuerpo: unknown, etiqueta: string): Promise<Resultado> {
  const token = process.env.WHATSAPP_TOKEN;
  const id = process.env.WHATSAPP_PHONE_ID;
  if (!token || !id) return { ok: false };
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
      const texto = await res.text();
      let codigo: number | undefined;
      try {
        codigo = (JSON.parse(texto) as { error?: { code?: number } }).error?.code;
      } catch {
        /* no era JSON */
      }
      console.error(`whatsapp: ${etiqueta} rechazado`, res.status, texto.slice(0, 400));
      return { ok: false, codigo };
    }
    return { ok: true };
  } catch (e) {
    console.error(`whatsapp: ${etiqueta} falló`, e);
    return { ok: false };
  }
}

/**
 * Los celulares argentinos tienen dos escrituras: 549 + área + número (la que usa WhatsApp)
 * y 54 + área + número. Meta guarda una u otra según cómo se cargó, y en el modo de prueba
 * compara literal. Si rechaza una, se prueba la otra antes de darse por vencido.
 */
function variantesArgentinas(a: string): string[] {
  if (/^549\d{10}$/.test(a)) return [a, `54${a.slice(3)}`];
  if (/^54[1-9]\d{9}$/.test(a)) return [a, `549${a.slice(2)}`];
  return [a];
}

/** Un mensaje de texto. Los links van sin preview para que no tape la respuesta. */
export async function enviarTexto(a: string, texto: string): Promise<boolean> {
  if (!texto.trim()) return false;
  const cuerpo = (to: string) => ({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: texto.slice(0, 4000), preview_url: false },
  });
  for (const destino of variantesArgentinas(a)) {
    const r = await graph("messages", cuerpo(destino), "envío");
    if (r.ok) return true;
    // 131030: "destinatario no está en la lista de prueba". Solo ahí vale probar la otra escritura.
    if (r.codigo !== 131030) return false;
  }
  return false;
}

/** El tilde azul. Barato y hace que no parezca un robot que ignora. Si falla, no importa. */
export async function marcarLeido(idMensaje: string): Promise<boolean> {
  return (await graph("messages", { messaging_product: "whatsapp", status: "read", message_id: idMensaje }, "marcar leído")).ok;
}

/**
 * La respuesta del vendedor, en texto plano para WhatsApp.
 *
 * Cuando el vendedor armó un pedido (acciones), no se manda un link por producto: se manda
 * UNO que abre el carrito con todo cargado. "Cerrar" tiene que ser un toque, no tres.
 * Se saca el link de wa.me: mandarle a alguien un link de WhatsApp dentro de WhatsApp no tiene sentido.
 */
export function paraWhatsapp(r: Respuesta): string {
  const base = urlSitio();
  const abs = (href: string) => (href.startsWith("http") ? href : `${base}${href}`);
  const partes = [r.texto.trim()];

  if (r.acciones?.length) {
    const lineas = r.acciones.map((a) => ({ tipo: a.clase, id: a.id, cantidad: a.cantidad }));
    partes.push(r.acciones.map((a) => `• ${a.cantidad > 1 ? `${a.cantidad} x ` : ""}${a.nombre} — ${a.precio}`).join("\n"));
    partes.push(`Tocá acá y te queda el pedido armado, listo para pagar:\n${abs(enlacePedido(lineas))}`);
  } else {
    const productos = (r.fichas ?? []).slice(0, 3).map((f) => `${f.nombre}${f.detalle ? ` · ${f.detalle}` : ""} — ${f.precio}\n${abs(f.href)}`);
    if (productos.length) partes.push(productos.join("\n\n"));
  }

  const enlaces = (r.enlaces ?? []).filter((e) => !e.href.includes("wa.me")).map((e) => `${e.texto}: ${abs(e.href)}`);
  if (enlaces.length) partes.push(enlaces.join("\n"));

  if (r.aviso) partes.push(r.aviso);
  return partes.filter(Boolean).join("\n\n");
}
