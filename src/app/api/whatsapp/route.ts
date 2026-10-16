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
import { atender, cola } from "@/lib/atencion";
import { cloudActivo } from "@/lib/whatsapp-cloud";
import { leerEntrante, type Entrante as EntranteMedia } from "@/lib/whatsapp-media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // hace falta crypto y after()

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

// "referral" llega en el primer mensaje cuando la persona tocó un anuncio "clic a WhatsApp".
type Referral = { source_id?: string; source_type?: string; source_url?: string; headline?: string; body?: string; ctwa_clid?: string };
type Entrante = EntranteMedia & { from: string; id: string; referral?: Referral };

/** El id del botón o la fila que tocó: dice qué eligió sin depender del texto del botón. */
function toqueDe(m: Entrante): string | null {
  if (m.type !== "interactive") return null;
  return m.interactive?.button_reply?.id ?? m.interactive?.list_reply?.id ?? null;
}
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
    // En paralelo y no uno detrás del otro: si alguien manda «Hola» y «¿hay almendras?» juntos,
    // los dos quedan guardados enseguida y el vendedor contesta una sola vez, al último, con los dos a la vista.
    await Promise.all(
      mensajes.map(async ({ m, nombre }) => {
        if (!m?.from || !m.id) return;
        try {
          await atenderWhatsapp(m, nombre);
        } catch (e) {
          console.error("whatsapp: atender falló", cola(m.from), e);
        }
      }),
    );
  });

  return NextResponse.json({ ok: true });
}

async function atenderWhatsapp(m: Entrante, nombre: string | null): Promise<void> {
  if (!cloudActivo()) {
    console.error("whatsapp: faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_ID, no se contesta");
    return;
  }
  const ref = m.referral;
  const leido = leerEntrante(m);
  await atender({
    clave: m.from,
    idMensaje: m.id,
    nombre,
    texto: leido.texto,
    guardar: leido.guardar,
    silencioso: leido.silencioso,
    toque: toqueDe(m),
    tipo: m.type,
    anuncio: ref ? { id: ref.source_id ?? null, titulo: ref.headline ?? null, texto: ref.body ?? null, ctwaClid: ref.ctwa_clid ?? null } : null,
  });
}
