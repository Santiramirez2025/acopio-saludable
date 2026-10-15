// Webhook de WhatsApp Cloud API: el mismo vendedor del chat de la web, atendiendo WhatsApp.
//
// Tres cosas que no son obvias y que si se hacen mal se pagan caro:
//
// 1) Se verifica la firma de Meta y se rechaza lo que no venga firmado. Sin esto, cualquiera
//    que descubra la URL manda mensajes falsos y nos hace gastar tokens de API a su gusto.
// 2) Se contesta 200 enseguida y el trabajo pesado va en after(). Meta reintenta si tardás,
//    y un reintento con la respuesta ya mandada es el mismo mensaje dos veces.
// 3) El dedupe es la base: el wamid es clave primaria, así que una reentrega no inserta nada
//    y no se contesta. Antes era un Set en memoria que se perdía con cada instancia.
//
// La charla vive en la base: el hilo sobrevive a que Vercel recicle, y una persona puede
// tomarla desde el panel. Cuando la charla está en manos de una persona, el bot se calla.
//
// Las reglas de contenido son las mismas que en la web: salud se contesta siempre igual y
// sin pasar por el modelo.

import { after, NextResponse } from "next/server";
import crypto from "node:crypto";
import { detectar } from "@/lib/asistente";
import { buscarEnCatalogo } from "@/lib/asistente-catalogo";
import { responderComoVendedor, vendedorActivo } from "@/lib/vendedor";
import { cloudActivo, enviarTexto, marcarLeido, paraWhatsapp } from "@/lib/whatsapp-cloud";
import { cambiarEstado, estadoDe, historialDe, registrarEntrante, registrarSalida } from "@/lib/whatsapp-memoria";
import { AVISO_SUPLEMENTOS } from "@/lib/sitio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // hace falta crypto y after()

const SALUD =
  "Eso no te lo puedo responder: no damos indicaciones de salud ni de consumo. Para eso consultá a tu médico o nutricionista. " +
  "Si querés, te paso el producto con su presentación y precio.";

const DERIVADO = "Dale, te contesta una persona del equipo por acá mismo. Atendemos de lunes a sábado, de 8 a 20 h. Mientras tanto, si querés, contame qué necesitás así ya lo tiene a mano.";

// Un número de teléfono no va entero a los logs: con los últimos cuatro alcanza para seguir una charla.
const cola = (n: string) => `…${n.slice(-4)}`;

function firmaValida(crudo: string, cabecera: string | null): boolean {
  const secreto = process.env.WHATSAPP_APP_SECRET;
  if (!secreto || !cabecera?.startsWith("sha256=")) return false;
  const esperada = crypto.createHmac("sha256", secreto).update(crudo).digest();
  const recibida = Buffer.from(cabecera.slice(7), "hex");
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida);
}

/** Meta pide esto una sola vez, cuando se da de alta la URL en la consola. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN;
  if (esperado && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === esperado) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new Response("no", { status: 403 });
}

type Entrante = { from: string; id: string; type: string; text?: { body?: string } };
type Contacto = { wa_id?: string; profile?: { name?: string } };
type Cambio = { field?: string; value?: { messages?: Entrante[]; contacts?: Contacto[] } };

export async function POST(req: Request) {
  const crudo = await req.text();
  const firma = req.headers.get("x-hub-signature-256");
  if (!firmaValida(crudo, firma)) {
    // Esto es lo primero que hay que mirar cuando "no contesta": si el app secret está mal
    // pegado, todos los webhooks mueren acá y sin este log no se ve.
    console.error("whatsapp: firma inválida", { conFirma: Boolean(firma), conSecreto: Boolean(process.env.WHATSAPP_APP_SECRET), bytes: crudo.length });
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    console.error("whatsapp: cuerpo no es JSON");
    return NextResponse.json({ ok: true }); // nunca devolver error: Meta reintenta
  }

  const mensajes: { m: Entrante; nombre: string | null }[] = [];
  for (const e of (cuerpo.entry as { changes?: Cambio[] }[]) ?? []) {
    for (const c of e.changes ?? []) {
      const nombres = new Map((c.value?.contacts ?? []).map((k) => [k.wa_id ?? "", k.profile?.name ?? null]));
      for (const m of c.value?.messages ?? []) mensajes.push({ m, nombre: nombres.get(m.from) ?? null });
    }
  }
  console.log("whatsapp: webhook recibido", { mensajes: mensajes.length, tipos: mensajes.map((x) => x.m.type) });

  // El 200 sale ahora; contestar puede tardar varios segundos y Meta no espera.
  after(async () => {
    for (const { m, nombre } of mensajes) {
      if (!m?.from || !m.id) continue;
      try {
        await atender(m, nombre);
      } catch (e) {
        console.error("whatsapp: atender falló", cola(m.from), e);
      }
    }
  });

  return NextResponse.json({ ok: true });
}

async function responder(telefono: string, texto: string, de: "bot" = "bot"): Promise<boolean> {
  const enviado = await enviarTexto(telefono, texto);
  console.log("whatsapp: envío", { de: cola(telefono), enviado });
  if (enviado) await registrarSalida(telefono, de, texto);
  return enviado;
}

async function atender(m: Entrante, nombre: string | null): Promise<void> {
  if (!cloudActivo()) {
    console.error("whatsapp: faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_ID, no se contesta");
    return;
  }

  const texto = m.type === "text" ? (m.text?.body ?? "").trim().slice(0, 400) : `[${m.type}]`;
  const nuevo = await registrarEntrante(m.id, m.from, nombre, texto);
  if (!nuevo) {
    console.log("whatsapp: repetido, se ignora", m.id);
    return;
  }
  await marcarLeido(m.id);

  // Una persona tomó la charla: el bot no se mete. El mensaje queda guardado y suma no leídos.
  if ((await estadoDe(m.from)) === "persona") {
    console.log("whatsapp: en manos de una persona, el bot se calla", cola(m.from));
    return;
  }

  if (m.type !== "text") {
    await responder(m.from, "Por ahora te leo solo mensajes de texto. Escribime qué estás buscando y te paso precio y link.");
    return;
  }
  if (!texto) return;

  if (detectar(texto) === "salud") {
    await responder(m.from, `${SALUD}\n\n${AVISO_SUPLEMENTOS}`);
    return;
  }

  // El historial se lee sin el mensaje recién guardado: el vendedor lo recibe aparte.
  const historial = (await historialDe(m.from, 9)).slice(0, -1);
  const inicio = Date.now();
  const r = vendedorActivo() ? await responderComoVendedor(texto, historial, null, "whatsapp") : null;
  const respuesta = r ?? (await buscarEnCatalogo(texto));
  // Pedir una persona deriva siempre, conteste la IA o el motor de reglas. Y el texto es fijo:
  // el modelo tiende a prometer "el link de arriba" u otras cosas que acá no existen.
  const derivar = Boolean(respuesta.derivar) || detectar(texto) === "humano";
  const salida = derivar ? DERIVADO : paraWhatsapp(respuesta);
  console.log("whatsapp: respuesta armada", { de: cola(m.from), conIA: Boolean(r), ms: Date.now() - inicio, largo: salida.length, derivar });
  if (!salida) return;

  await responder(m.from, salida);
  if (derivar) await cambiarEstado(m.from, "persona");
}
