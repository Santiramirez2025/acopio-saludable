// Prospección por WhatsApp: le escribimos primero a alojamientos de la zona.
//
// WhatsApp no deja abrir una charla con texto libre: el primer mensaje tiene que ser una
// plantilla aprobada por Meta. Por eso la plantilla no lleva precios (cambian todos los días
// y la plantilla es fija) y termina en dos botones: el que dice que sí abre la charla y ahí
// el vendedor ya contesta con precios reales; el que dice que no da de baja al número.
//
// Quien dice que no, no vuelve a recibir nada: es lo correcto y además es lo que cuida la
// calificación del número. Si muchos bloquean, Meta limita los envíos o suspende el número.

import { prisma } from "./prisma";
import { IDIOMA, PLANTILLAS, plantillaDe, textoPlantilla } from "./whatsapp-plantillas";

export { contextoProspecto, esBaja } from "./whatsapp-plantillas";

const GRAPH = "https://graph.facebook.com/v21.0";

type Graph = { ok: boolean; estado: number; cuerpo: unknown };

async function graph(camino: string, metodo: "GET" | "POST" | "DELETE", cuerpo?: unknown): Promise<Graph> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) return { ok: false, estado: 0, cuerpo: "Falta WHATSAPP_TOKEN" };
  try {
    const res = await fetch(`${GRAPH}/${camino}`, {
      method: metodo,
      headers: { authorization: `Bearer ${token}`, ...(cuerpo ? { "content-type": "application/json" } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const texto = await res.text();
    let json: unknown = texto;
    try {
      json = JSON.parse(texto);
    } catch {
      /* texto plano */
    }
    return { ok: res.ok, estado: res.status, cuerpo: json };
  } catch (e) {
    return { ok: false, estado: 0, cuerpo: String(e) };
  }
}

/** Da de alta las plantillas en Meta. Si ya existen, Meta lo dice y no pasa nada. */
export async function crearPlantillas(): Promise<Record<string, Graph>> {
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!waba) throw new Error("Falta WHATSAPP_WABA_ID");
  const salida: Record<string, Graph> = {};
  for (const p of Object.values(PLANTILLAS)) {
    salida[p.nombre] = await graph(`${waba}/message_templates`, "POST", {
      name: p.nombre,
      language: IDIOMA,
      category: "MARKETING",
      components: [
        { type: "BODY", text: p.cuerpo, example: { body_text: [["Hotel del Lago"]] } },
        { type: "BUTTONS", buttons: p.botones.map((text) => ({ type: "QUICK_REPLY", text })) },
      ],
    });
  }
  return salida;
}

/**
 * Borra una plantilla de prospección por nombre. Solo las de alojamientos: las demás
 * (hello_world o las que use otro sistema) no se tocan desde acá.
 * Ojo: Meta no deja reusar el nombre de una plantilla borrada por 30 días.
 */
export async function borrarPlantilla(nombre: string): Promise<Graph> {
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!waba) return { ok: false, estado: 0, cuerpo: "Falta WHATSAPP_WABA_ID" };
  if (!/^acopio_alojamientos_[a-z0-9_]+$/.test(nombre)) return { ok: false, estado: 400, cuerpo: "Solo se borran plantillas de alojamientos" };
  return graph(`${waba}/message_templates?name=${encodeURIComponent(nombre)}`, "DELETE");
}

/** Estado de las plantillas: PENDING mientras Meta las revisa, APPROVED cuando se pueden usar. */
export async function estadoPlantillas(): Promise<Graph> {
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!waba) return { ok: false, estado: 0, cuerpo: "Falta WHATSAPP_WABA_ID" };
  return graph(`${waba}/message_templates?fields=name,status,category,language,rejected_reason&limit=50`, "GET");
}

export type ResultadoEnvio = { telefono: string; negocio: string; ok: boolean; motivo?: string };

/** Manda la plantilla a un número y deja la charla registrada como prospecto. */
export async function enviarProspecto(telefono: string, negocio: string, rubro: string, forzar = false): Promise<ResultadoEnvio> {
  const tel = telefono.replace(/\D/g, "");
  const nombre = negocio.trim().slice(0, 60) || "¿cómo están?";
  if (!/^549\d{10}$/.test(tel)) return { telefono: tel, negocio, ok: false, motivo: "no es un celular argentino" };

  const previa = await prisma.$queryRaw<{ baja: boolean; contactado: Date | null }[]>`
    SELECT "baja", "contactado" FROM "WhatsappConversacion" WHERE "telefono" = ${tel}
  `;
  if (previa[0]?.baja) return { telefono: tel, negocio, ok: false, motivo: "pidió no recibir más mensajes" };
  if (previa[0]?.contactado && !forzar) return { telefono: tel, negocio, ok: false, motivo: "ya se le escribió" };

  const id = process.env.WHATSAPP_PHONE_ID;
  if (!id) return { telefono: tel, negocio, ok: false, motivo: "falta WHATSAPP_PHONE_ID" };
  const clave = plantillaDe(rubro);
  const r = await graph(`${id}/messages`, "POST", {
    messaging_product: "whatsapp",
    to: tel,
    type: "template",
    template: {
      name: PLANTILLAS[clave].nombre,
      language: { code: IDIOMA },
      components: [{ type: "body", parameters: [{ type: "text", text: nombre }] }],
    },
  });
  if (!r.ok) {
    const err = (r.cuerpo as { error?: { code?: number; message?: string; error_data?: { details?: string } } })?.error;
    console.error("whatsapp: plantilla rechazada", r.estado, JSON.stringify(r.cuerpo).slice(0, 400));
    return { telefono: tel, negocio, ok: false, motivo: `${err?.code ?? r.estado}: ${err?.error_data?.details ?? err?.message ?? "error"}` };
  }

  await prisma.$executeRaw`
    INSERT INTO "WhatsappConversacion" ("telefono", "nombre", "prospecto", "negocio", "contactado", "ultimoMensaje")
    VALUES (${tel}, ${negocio}, ${rubro}, ${negocio}, now(), now())
    ON CONFLICT ("telefono") DO UPDATE
      SET "prospecto" = EXCLUDED."prospecto", "negocio" = EXCLUDED."negocio", "contactado" = now(), "ultimoMensaje" = now()
  `;
  const idSalida = `tpl.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
  await prisma.$executeRaw`
    INSERT INTO "WhatsappMensaje" ("id", "telefono", "de", "texto") VALUES (${idSalida}, ${tel}, 'bot', ${textoPlantilla(clave, nombre)})
  `;
  return { telefono: tel, negocio, ok: true };
}

export type DatosProspecto = { prospecto: string | null; negocio: string | null; baja: boolean };

export async function datosProspecto(telefono: string): Promise<DatosProspecto> {
  const filas = await prisma.$queryRaw<DatosProspecto[]>`
    SELECT "prospecto", "negocio", "baja" FROM "WhatsappConversacion" WHERE "telefono" = ${telefono}
  `;
  return filas[0] ?? { prospecto: null, negocio: null, baja: false };
}

export async function darDeBaja(telefono: string): Promise<void> {
  await prisma.$executeRaw`UPDATE "WhatsappConversacion" SET "baja" = true WHERE "telefono" = ${telefono}`;
}
