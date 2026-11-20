// Promo de la semana a los clientes que ya compraron (Santiago, 19/11: «aprovechemos sin molestarlos, de la mejor
// manera, a los clientes que ya hicimos»). La arma el equipo cada semana con lo que La Granja tiene en oferta y su
// gráfica; sale los jueves a media mañana (la gente arma el finde y el reparto del viernes y sábado ya está).
//
// Cuidados para no molestar:
// - Solo a quien ya recibió un pedido, y nunca dentro de los 5 días de su última compra.
// - Como máximo una promo por semana, y nunca si en los últimos 2 días le escribimos algo (bot o equipo) o si
//   está charlando con nosotros (escribió en las últimas 24 h).
// - Dos promos seguidas sin ninguna respuesta suya: no se le manda más hasta que vuelva a escribir.
// - Si se cruza con la recompra (le salió en los últimos 7 días), va la recompra y no la promo.
// - Botón «No me manden promos»: no recibe más promos, pero lo seguimos atendiendo si escribe.
import { put, list } from "@vercel/blob";
// prisma se importa adentro de cada función: así las reglas puras se prueban sin base.
const db = async () => (await import("./prisma")).prisma;
import { primerNombre } from "./whatsapp-interactivo";

export const PLANTILLA_PROMO = "acopio_promo_semana_v1";
export const BOTON_SI = "Sí, quiero";
export const BOTON_AHORA_NO = "Ahora no";
export const BOTON_NO_PROMOS = "No me manden promos";
export const CUERPO_PROMO =
  "¡Hola {{1}}! Te escribimos de Acopio Saludable: esta semana tenemos {{2}}. Te lo llevamos a tu casa como la vez pasada. ¿Te guardo uno?";
const GRAPH = "https://graph.facebook.com/v21.0";
const TOPE = 80;
const ARCHIVO = "promos/semana.json";

export type Promo = {
  /** Lo que va en {{2}}: corto y con precio. Ej.: «nuez mariposa a $15.900 el kilo (antes $18.500)». */
  titulo: string;
  /** Para el vendedor: qué se ofrece, precios exactos, códigos y hasta cuándo. Lo lee si el cliente contesta. */
  contexto: string;
  /** Gráfica (https) que va arriba del mensaje. */
  imagen: string;
  /** Carrito armado, ej. /carrito?p=TG-NUEZ*1 (opcional). */
  camino?: string;
  /** Hasta cuándo vale (AAAA-MM-DD). Pasada esa fecha no sale. */
  hasta: string;
  /** Cuándo la guardó el equipo. */
  creada: string;
};

export async function leerPromo(): Promise<Promo | null> {
  const url = await list({ prefix: ARCHIVO }).then((l) => l.blobs[0]?.url).catch(() => undefined);
  if (!url) return null;
  return fetch(`${url}?t=${Date.now()}`, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<Promo>) : null)).catch(() => null);
}

export async function guardarPromo(p: Omit<Promo, "creada">): Promise<Promo> {
  const promo: Promo = { ...p, creada: new Date().toISOString() };
  await put(ARCHIVO, JSON.stringify(promo), { access: "public", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
  return promo;
}

export function promoVigente(p: Promo | null, hoy = new Date()): p is Promo {
  if (!p?.titulo || !p.imagen || !p.hasta) return false;
  const hasta = new Date(`${p.hasta}T23:59:59-03:00`);
  // Tiene que ser de esta semana: guardada hace menos de 8 días y sin vencer.
  return hasta >= hoy && hoy.getTime() - new Date(p.creada).getTime() < 8 * 864e5;
}

type Candidato = { telefono: string; nombre: string | null };

export async function candidatosPromo(): Promise<Candidato[]> {
  const prisma = await db();
  return prisma.$queryRaw<Candidato[]>`
    SELECT c."telefono", c."nombre" FROM "WhatsappConversacion" c
    WHERE c."baja" = false AND c."prospecto" IS NULL AND c."telefono" ~ '^[0-9]+$' AND c."estado" <> 'persona'
      -- Ya recibió al menos un pedido…
      AND EXISTS (SELECT 1 FROM "Order" o WHERE right(regexp_replace(o."telefono", '[^0-9]', '', 'g'), 10) = right(c."telefono", 10) AND o."estado" = 'ENTREGADO')
      -- …y no compró ni tiene un pedido en curso de los últimos 5 días.
      AND NOT EXISTS (SELECT 1 FROM "Order" o WHERE right(regexp_replace(o."telefono", '[^0-9]', '', 'g'), 10) = right(c."telefono", 10)
                        AND o."estado" <> 'CANCELADO' AND o."createdAt" > now() - interval '10 days'
                        AND (o."createdAt" > now() - interval '5 days' OR o."estado" <> 'ENTREGADO'))
      -- No pidió que no le mandemos promos.
      AND NOT EXISTS (SELECT 1 FROM "WhatsappMensaje" n WHERE n."telefono" = c."telefono" AND n."id" LIKE 'promo-no.%')
      -- Una por semana.
      AND NOT EXISTS (SELECT 1 FROM "WhatsappMensaje" p WHERE p."telefono" = c."telefono" AND p."id" LIKE 'promo.%' AND p."fecha" > now() - interval '6 days')
      -- La recompra tiene prioridad.
      AND NOT EXISTS (SELECT 1 FROM "WhatsappMensaje" r WHERE r."telefono" = c."telefono" AND r."id" LIKE 'recompra.%' AND r."fecha" > now() - interval '7 days')
      -- Nada nuestro en los últimos 2 días, y no está charlando ahora.
      AND NOT EXISTS (SELECT 1 FROM "WhatsappMensaje" a WHERE a."telefono" = c."telefono" AND a."de" IN ('bot', 'persona') AND a."fecha" > now() - interval '2 days')
      AND NOT EXISTS (SELECT 1 FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" AND m."de" = 'cliente' AND m."fecha" > now() - interval '24 hours')
      -- Dos promos seguidas sin respuesta: basta.
      AND (SELECT count(*) FROM "WhatsappMensaje" p WHERE p."telefono" = c."telefono" AND p."id" LIKE 'promo.%'
             AND p."fecha" > coalesce((SELECT max(m."fecha") FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" AND m."de" = 'cliente'), 'epoch')) < 2
    ORDER BY c."ultimoMensaje" DESC
    LIMIT ${TOPE}`;
}

export function textoPromo(nombre: string, p: Promo): string {
  return (
    `[Promo semanal] ${CUERPO_PROMO.replace("{{1}}", nombre).replace("{{2}}", p.titulo)} ` +
    `[Botones: ${BOTON_SI} · ${BOTON_AHORA_NO} · ${BOTON_NO_PROMOS}] ` +
    `[Para el vendedor: ${p.contexto}${p.camino ? ` · carrito: ${p.camino}` : ""} · vale hasta el ${p.hasta}. Si dice que sí, armá el pedido con eso y confirmá la dirección de la vez pasada.]`
  );
}

async function enviarPlantilla(tel: string, nombre: string, p: Promo): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const id = process.env.WHATSAPP_PHONE_ID;
  if (!token || !id) return { ok: false, error: "faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_ID" };
  const res = await fetch(`${GRAPH}/${id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: tel,
      type: "template",
      template: {
        name: PLANTILLA_PROMO,
        language: { code: "es_AR" },
        components: [
          { type: "header", parameters: [{ type: "image", image: { link: p.imagen } }] },
          { type: "body", parameters: [{ type: "text", text: nombre }, { type: "text", text: p.titulo }] },
        ],
      },
    }),
  }).catch(() => null);
  if (res?.ok) return { ok: true };
  return { ok: false, error: res ? `${res.status} ${(await res.text()).slice(0, 300)}` : "sin respuesta" };
}

/** Manda la promo de la semana. Con `solo`, a ese número nada más (prueba), salteando los filtros. */
export async function correrPromo(opts: { solo?: string; simular?: boolean } = {}): Promise<{ enviados: string[]; fallidos: number; error?: string; candidatos?: number }> {
  const p = await leerPromo();
  if (!promoVigente(p)) return { enviados: [], fallidos: 0, error: "no hay promo vigente de esta semana" };
  const lista = opts.solo ? [{ telefono: opts.solo, nombre: null }] : await candidatosPromo();
  if (opts.simular) return { enviados: lista.map((c) => c.nombre ?? c.telefono.slice(-4)), fallidos: 0, candidatos: lista.length };
  const enviados: string[] = [];
  let fallidos = 0;
  let error: string | undefined;
  for (const c of lista) {
    const nombre = primerNombre(c.nombre) || "¿cómo estás?";
    const r = await enviarPlantilla(c.telefono, nombre, p);
    if (r.ok) {
      const prisma = await db();
      await prisma.$executeRaw`INSERT INTO "WhatsappMensaje" ("id", "telefono", "de", "texto") VALUES (${`promo.${c.telefono}.${Date.now()}`}, ${c.telefono}, 'bot', ${textoPromo(nombre, p)})`;
      enviados.push(c.nombre ?? c.telefono.slice(-4));
    } else {
      fallidos++;
      error ??= r.error;
    }
    await new Promise((ok) => setTimeout(ok, 400));
  }
  return { enviados, fallidos, error };
}

/** «No me manden promos»: no recibe más promos, pero si escribe se lo atiende igual. */
export async function bajaDePromos(telefono: string): Promise<void> {
  const prisma = await db();
  await prisma.$executeRaw`INSERT INTO "WhatsappMensaje" ("id", "telefono", "de", "texto") VALUES (${`promo-no.${telefono}.${Date.now()}`}, ${telefono}, 'bot', ${"[Pidió no recibir más promos]"})`;
}

export function pideNoPromos(texto: string): boolean {
  return /^\s*no me manden (m[aá]s )?promos\s*$/i.test(texto) || /\b(no me (manden|mandes|env[ií]en) (m[aá]s )?(promos|promociones|ofertas))\b/i.test(texto);
}

/** Crea la plantilla en Meta con la gráfica de ejemplo (la subida reanudable da el «handle» que pide Meta). */
export async function crearPlantillaPromo(imagenEjemplo: string): Promise<unknown> {
  const token = process.env.WHATSAPP_TOKEN;
  const waba = process.env.WHATSAPP_WABA_ID;
  const app = process.env.WHATSAPP_APP_ID;
  if (!token || !waba || !app) return { error: "faltan WHATSAPP_TOKEN, WHATSAPP_WABA_ID o WHATSAPP_APP_ID" };
  const img = await fetch(imagenEjemplo, { signal: AbortSignal.timeout(20_000) });
  if (!img.ok) return { error: `no pude leer la imagen (${img.status})` };
  const bytes = Buffer.from(await img.arrayBuffer());
  const tipo = img.headers.get("content-type") ?? "image/jpeg";
  const ses = await fetch(`${GRAPH}/${app}/uploads?file_name=promo&file_length=${bytes.length}&file_type=${encodeURIComponent(tipo)}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  }).then((r) => r.json() as Promise<{ id?: string }>);
  if (!ses.id) return { paso: "sesion", ses };
  const sub = (await fetch(`${GRAPH}/${ses.id}`, { method: "POST", headers: { authorization: `OAuth ${token}`, file_offset: "0" }, body: bytes }).then((r) => r.json())) as { h?: string };
  if (!sub.h) return { paso: "subida", sub };
  const res = await fetch(`${GRAPH}/${waba}/message_templates`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: PLANTILLA_PROMO,
      language: "es_AR",
      category: "MARKETING",
      components: [
        { type: "HEADER", format: "IMAGE", example: { header_handle: [sub.h] } },
        { type: "BODY", text: CUERPO_PROMO, example: { body_text: [["Ana", "nuez mariposa a $15.900 el kilo (antes $18.500)"]] } },
        { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: BOTON_SI }, { type: "QUICK_REPLY", text: BOTON_AHORA_NO }, { type: "QUICK_REPLY", text: BOTON_NO_PROMOS }] },
      ],
    }),
  });
  return { estado: res.status, cuerpo: await res.json().catch(() => null) };
}
