// Webhook de WhatsApp Cloud API: el mismo vendedor del chat de la web, atendiendo WhatsApp.
//
// Tres cosas que no son obvias y que si se hacen mal se pagan caro:
//
// 1) Se verifica la firma de Meta y se rechaza lo que no venga firmado. Sin esto, cualquiera
//    que descubra la URL manda mensajes falsos y nos hace gastar tokens de API a su gusto.
// 2) Se contesta 200 enseguida y el trabajo pesado va en after(). Meta reintenta si tardás,
//    y un reintento con la respuesta ya mandada es el mismo mensaje dos veces.
// 3) Igual se descartan los ids repetidos, porque Meta reentrega también por su cuenta.
//
// Las reglas de contenido son las mismas que en la web: salud se contesta siempre igual y
// sin pasar por el modelo.

import { after, NextResponse } from "next/server";
import crypto from "node:crypto";
import { detectar } from "@/lib/asistente";
import { buscarEnCatalogo } from "@/lib/asistente-catalogo";
import { responderComoVendedor, vendedorActivo, type Turno } from "@/lib/vendedor";
import { cloudActivo, enviarTexto, marcarLeido, paraWhatsapp } from "@/lib/whatsapp-cloud";
import { AVISO_SUPLEMENTOS } from "@/lib/sitio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // hace falta crypto y after()

const SALUD =
  "Eso no te lo puedo responder: no damos indicaciones de salud ni de consumo. Para eso consultá a tu médico o nutricionista. " +
  "Si querés, te paso el producto con su presentación y precio.";

// Memoria de la instancia, no de la base: alcanza para que una charla seguida tenga hilo.
// Si el servidor se recicla, la conversación arranca de nuevo. Es un costo aceptable
// frente a sumar una tabla; cuando haya volumen, esto va a la base.
const VENTANA_MS = 30 * 60 * 1000;
const charlas = new Map<string, { turnos: Turno[]; hasta: number }>();
const vistos = new Set<string>();

function recordar(de: string): Turno[] {
  const c = charlas.get(de);
  if (!c || c.hasta < Date.now()) return [];
  return c.turnos;
}

function guardar(de: string, turnos: Turno[]): void {
  charlas.set(de, { turnos: turnos.slice(-8), hasta: Date.now() + VENTANA_MS });
  if (charlas.size > 500) {
    for (const [k, v] of charlas) if (v.hasta < Date.now()) charlas.delete(k);
  }
}

function yaVisto(id: string): boolean {
  if (vistos.has(id)) return true;
  vistos.add(id);
  if (vistos.size > 1000) for (const v of vistos) { vistos.delete(v); if (vistos.size <= 500) break; }
  return false;
}

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

export async function POST(req: Request) {
  const crudo = await req.text();
  if (!firmaValida(crudo, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return NextResponse.json({ ok: true }); // nunca devolver error: Meta reintenta
  }

  const mensajes: Entrante[] = [];
  for (const e of (cuerpo.entry as { changes?: { value?: { messages?: Entrante[] } }[] }[]) ?? []) {
    for (const c of e.changes ?? []) for (const m of c.value?.messages ?? []) mensajes.push(m);
  }

  // El 200 sale ahora; contestar puede tardar varios segundos y Meta no espera.
  after(async () => {
    for (const m of mensajes) {
      if (!m?.from || !m.id || yaVisto(m.id)) continue;
      await atender(m);
    }
  });

  return NextResponse.json({ ok: true });
}

async function atender(m: Entrante): Promise<void> {
  if (!cloudActivo()) return;
  await marcarLeido(m.id);

  if (m.type !== "text") {
    await enviarTexto(m.from, "Por ahora te leo solo mensajes de texto. Escribime qué estás buscando y te paso precio y link.");
    return;
  }
  const texto = (m.text?.body ?? "").trim().slice(0, 400);
  if (!texto) return;

  if (detectar(texto) === "salud") {
    await enviarTexto(m.from, `${SALUD}\n\n${AVISO_SUPLEMENTOS}`);
    return;
  }

  const historial = recordar(m.from);
  const r = vendedorActivo() ? await responderComoVendedor(texto, historial) : null;
  const respuesta = r ?? (await buscarEnCatalogo(texto));
  const salida = paraWhatsapp(respuesta);
  if (!salida) return;

  if (await enviarTexto(m.from, salida)) {
    guardar(m.from, [...historial, { de: "yo", texto }, { de: "acopio", texto: respuesta.texto }]);
  }
}
