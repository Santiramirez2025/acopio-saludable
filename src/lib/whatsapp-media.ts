// Lo que no es texto (audio, foto, reacción, ubicación) también entra a la charla.
//
// Se guarda como texto con una marca, «[audio·<id de Meta>]», porque la charla vive en una sola
// columna de texto. El panel lee la marca y muestra el audio o la foto; el vendedor la ve sin el id.
//
// Puro (sin base ni red): se prueba sin gastar nada.

export type Entrante = {
  type: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
  reaction?: { emoji?: string; message_id?: string };
  image?: { id?: string; caption?: string; mime_type?: string };
  audio?: { id?: string; mime_type?: string; voice?: boolean };
  video?: { id?: string; caption?: string; mime_type?: string };
  document?: { id?: string; caption?: string; filename?: string; mime_type?: string };
  sticker?: { id?: string; mime_type?: string };
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
  contacts?: { name?: { formatted_name?: string }; phones?: { phone?: string }[] }[];
};

export type Leido = {
  /** Lo que se guarda en la charla (con la marca del archivo, si hay). */
  guardar: string;
  /** Lo que lee el vendedor. null: no hay nada que pueda leer (audio, foto sin texto). */
  texto: string | null;
  /** Reacciones y stickers: se guardan y no se contestan. */
  silencioso: boolean;
};

const MEDIOS = ["image", "audio", "video", "document", "sticker"] as const;
type Medio = (typeof MEDIOS)[number];
export const NOMBRE_MEDIO: Record<Medio, string> = { image: "foto", audio: "audio", video: "video", document: "archivo", sticker: "sticker" };

export const marca = (tipo: Medio, id: string) => `[${NOMBRE_MEDIO[tipo]}·${id}]`;

export function leerEntrante(m: Entrante): Leido {
  if (m.type === "text") return { guardar: m.text?.body ?? "", texto: m.text?.body ?? "", silencioso: false };
  if (m.type === "button") return { guardar: m.button?.text ?? "", texto: m.button?.text ?? "", silencioso: false };
  if (m.type === "interactive") {
    const t = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "";
    return { guardar: t, texto: t, silencioso: false };
  }
  if (m.type === "reaction") {
    const e = m.reaction?.emoji;
    return { guardar: e ? `[reacción ${e}]` : "[sacó la reacción]", texto: null, silencioso: true };
  }
  if (m.type === "location") {
    const l = m.location ?? {};
    const lugar = [l.name, l.address].filter(Boolean).join(", ");
    const mapa = l.latitude != null && l.longitude != null ? ` (${l.latitude}, ${l.longitude})` : "";
    const t = `Te mando mi ubicación: ${lugar || "sin dirección"}${mapa}`;
    return { guardar: `📍 ${lugar || "Ubicación"}${mapa}`, texto: t, silencioso: false };
  }
  if (m.type === "contacts") {
    const c = m.contacts?.[0];
    const t = `Contacto: ${c?.name?.formatted_name ?? ""} ${c?.phones?.[0]?.phone ?? ""}`.trim();
    return { guardar: `👤 ${t}`, texto: t, silencioso: false };
  }
  if ((MEDIOS as readonly string[]).includes(m.type)) {
    const tipo = m.type as Medio;
    const cuerpo = m[tipo] as { id?: string; caption?: string; filename?: string } | undefined;
    const pie = (cuerpo?.caption ?? "").trim();
    const base = cuerpo?.id ? marca(tipo, cuerpo.id) : `[${NOMBRE_MEDIO[tipo]}]`;
    const nombre = tipo === "document" && cuerpo?.filename ? ` ${cuerpo.filename}` : "";
    return { guardar: `${base}${nombre}${pie ? ` ${pie}` : ""}`, texto: pie || null, silencioso: tipo === "sticker" };
  }
  return { guardar: `[${m.type}]`, texto: null, silencioso: false };
}

/** Para el panel: separa la marca del texto que la acompaña. */
export function partirMarca(texto: string): { tipo: string; id: string; resto: string } | null {
  const r = /^\[(foto|audio|video|archivo|sticker)·([^\]\s]+)\]\s?([\s\S]*)$/.exec(texto);
  return r ? { tipo: r[1], id: r[2], resto: r[3] } : null;
}

/** Para el vendedor: la marca sin el id, que no le dice nada. */
export const sinIds = (texto: string) => texto.replace(/^\[(foto|audio|video|archivo|sticker)·[^\]\s]+\]/, "[$1]");

/** Qué contestar cuando manda algo que el vendedor no puede leer. */
export function respuestaMedio(tipo: string): string {
  if (tipo === "audio") return "¡Gracias por el audio! Justo ahora no puedo escucharlo, ¿me lo escribís en un mensajito? Así te respondo al toque 🙌";
  return "¡Recibido! Contame en un mensajito qué estás buscando y te paso precio al toque.";
}
