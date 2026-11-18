// Regalo de recetas (Santiago, 15/11): a los clientes que ya compraron se les manda UNA sola vez un link a
// /regalo, la página con el recetario para usar lo que ya tienen en casa. No vende nada: es un gracias.
// Como pasaron más de 24 h desde su último mensaje, va con plantilla aprobada por Meta.

import { prisma } from "./prisma";
import { primerNombre } from "./whatsapp-interactivo";
import { telefonoWa } from "./telefono";
import { REGALO_TOPE_DEFECTO } from "./regalo-tope";

export { topeRegalo } from "./regalo-tope";

// v2: la v1 decía «26 recetas» y son 25; sin número no queda vieja cuando se sumen más.
export const PLANTILLA_REGALO = "acopio_regalo_recetas_v3";
export const URL_REGALO = "https://www.acopiosaludable.com/regalo";
const GRAPH = "https://graph.facebook.com/v21.0";

type Candidato = { nombre: string; telefono: string };

/** Un cliente por teléfono, con al menos un pedido entregado; nunca a quien pidió la baja ni a quien ya lo recibió. */
async function candidatos(): Promise<Candidato[]> {
  return prisma.$queryRaw<Candidato[]>`
    SELECT DISTINCT ON (right(regexp_replace(o."telefono", '[^0-9]', '', 'g'), 10)) o."nombre", o."telefono" FROM "Order" o
    WHERE o."estado" = 'ENTREGADO' AND o."nombre" NOT ILIKE '%prueba%'
      AND NOT EXISTS (SELECT 1 FROM "WhatsappMensaje" m WHERE m."id" LIKE 'regalo.%' AND right(m."telefono", 10) = right(regexp_replace(o."telefono", '[^0-9]', '', 'g'), 10))
      AND NOT EXISTS (SELECT 1 FROM "WhatsappConversacion" c WHERE c."baja" AND right(c."telefono", 10) = right(regexp_replace(o."telefono", '[^0-9]', '', 'g'), 10))
    ORDER BY right(regexp_replace(o."telefono", '[^0-9]', '', 'g'), 10), o."id" DESC`;
}

export const textoRegalo = (nombre: string) =>
  `Hola ${nombre}, te escribimos de Acopio Saludable. Gracias por tu compra 💚 Te dejo un regalo: nuestro recetario, con recetas fáciles para hacer con frutos secos, semillas y dátiles. ${URL_REGALO}`;

async function plantilla(tel: string, nombre: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const id = process.env.WHATSAPP_PHONE_ID;
  if (!token || !id) return false;
  const res = await fetch(`${GRAPH}/${id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: tel, type: "template", template: { name: PLANTILLA_REGALO, language: { code: "es_AR" }, components: [{ type: "body", parameters: [{ type: "text", text: nombre }] }] } }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res?.ok) console.error("regalo: plantilla rechazada", res?.status, res ? (await res.text()).slice(0, 300) : "");
  return Boolean(res?.ok);
}

/** Con `simular` solo dice a quién le llegaría. Manda como mucho `tope` (ver topeRegalo); `pendientes` son los que quedan. */
export async function correrRegalo(simular: boolean, tope: number = REGALO_TOPE_DEFECTO): Promise<{ simulado: boolean; destinatarios: string[]; enviados: string[]; fallidos: number; pendientes: number }> {
  const todos = await candidatos();
  const lista = todos.slice(0, Math.max(0, tope));
  const pendientes = todos.length - lista.length;
  // Solo el primer nombre: la respuesta la leen agentes y no hace falta el nombre completo del cliente.
  const destinatarios = lista.map((c) => primerNombre(c.nombre) || "cliente");
  if (simular) return { simulado: true, destinatarios, enviados: [], fallidos: 0, pendientes };
  const enviados: string[] = [];
  let fallidos = 0;
  for (const c of lista) {
    const tel = telefonoWa(c.telefono);
    if (!tel) { fallidos++; continue; }
    const nombre = primerNombre(c.nombre) || "¿cómo estás?";
    if (await plantilla(tel, nombre)) {
      await prisma.$executeRaw`
        INSERT INTO "WhatsappConversacion" ("telefono", "nombre", "ultimoMensaje") VALUES (${tel}, ${c.nombre}, now())
        ON CONFLICT ("telefono") DO UPDATE SET "ultimoMensaje" = now()`;
      await prisma.$executeRaw`INSERT INTO "WhatsappMensaje" ("id", "telefono", "de", "texto") VALUES (${`regalo.${tel}.${Date.now()}`}, ${tel}, 'bot', ${textoRegalo(nombre)})`;
      enviados.push(primerNombre(c.nombre) || "cliente");
    } else fallidos++;
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log("regalo: tanda enviada", { enviados: enviados.length, fallidos, pendientes });
  return { simulado: false, destinatarios, enviados, fallidos, pendientes };
}

export async function crearPlantillaRegalo(): Promise<unknown> {
  const token = process.env.WHATSAPP_TOKEN;
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!token || !waba) return { error: "faltan WHATSAPP_TOKEN o WHATSAPP_WABA_ID" };
  const res = await fetch(`${GRAPH}/${waba}/message_templates`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: PLANTILLA_REGALO,
      language: "es_AR",
      category: "MARKETING",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, te escribimos de Acopio Saludable. Gracias por tu compra 💚 Te dejo un regalo: nuestro recetario, con recetas fáciles para hacer con los frutos secos, las semillas y los dátiles que ya tenés en casa.",
          example: { body_text: [["Ana"]] },
        },
        { type: "BUTTONS", buttons: [{ type: "URL", text: "Ver mis recetas", url: URL_REGALO }] },
      ],
    }),
  });
  return res.json();
}
