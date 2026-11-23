// Comentarios en las publicaciones y anuncios de Instagram y Facebook: lo puro (sin red ni base).
//
// Quien comenta con intención de compra («precio», «info», «cuánto», «quiero»…) recibe una
// respuesta pública corta y un mensaje privado con un precio real y una pregunta: si contesta,
// la charla sigue en Direct o Messenger con el vendedor. Al resto se le agradece en público.
// Así cada comentario de un anuncio o un post se convierte en una conversación, sin bots que
// sigan cuentas ni comenten afuera (eso Instagram lo castiga).

export type Comentario = { canal: "instagram" | "facebook"; id: string; texto: string; autorId: string; autorNombre: string | null; esRespuesta: boolean };

const sinAcentos = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Quiere comprar o saber precios. */
export function tieneIntencion(texto: string): boolean {
  const t = sinAcentos(texto);
  return /\b(precio|precios|cuanto|cuesta|sale|valor|info|informacion|quiero|me interesa|interesad|lista|envio|envian|mandan|llega|pedido|comprar|donde|direccion|dm|md|privado|whatsapp|wsp|kilo|kg)\b|\$|\?/.test(t);
}

/** Comentarios que no se contestan: vacíos, solo emojis cortos de otra cuenta propia, o spam con links. */
export function ignorar(texto: string): boolean {
  const t = texto.trim();
  return !t || /https?:\/\/|www\./i.test(t);
}

/**
 * 17/11 (Santiago, 18 comentarios del anuncio del Trío): las respuestas públicas eran «¡Te escribimos por privado!»
 * y el privado iba por Messenger ofreciendo la Despensa a $28.500, que ya no se vendía. A «Y a mí me cobraron
 * 32 mil pesos» le contestó «¡Qué bueno que te guste! 💛». Ahora la respuesta pública ya trae lo que preguntó
 * (qué trae, cuánto sale, dónde estamos) y el WhatsApp, que es donde se vende. Las quejas no se contestan solas:
 * le avisan a Santiago.
 */
export const WHATSAPP_VISIBLE = "3541 51-9630";

export type TipoComentario = "queja" | "donde" | "compra" | "gracias";

export function tipoComentario(texto: string): TipoComentario {
  const t = sinAcentos(texto);
  if (/\b(cobrar[oa]n|cobraste|me cobr|engan|estafa|chant|mentira|trucho|caro|carisimo|reclamo|nunca (me )?lleg|no (me )?lleg|no vino|rancio|feo|horrible|pesimo|mala atencion|no contestan|no responden|clavaron)/.test(t)) return "queja";
  if (/\b(donde|direccion|ubicacion|ubicados|local|retirar|buscar|horario)\b/.test(t)) return "donde";
  if (tieneIntencion(texto) || /\b(trae|incluye|viene|combo|me interesa|m interesa|interesa|pasas info|pasame)\b/.test(t)) return "compra";
  return "gracias";
}

/** Respuesta pública con el dato que preguntó y el WhatsApp. `oferta`: «El Trío son 3 kg (...): $22.000 pagando antes...». */
export function respuestaPublica(c: Comentario, conDm: boolean, oferta?: string | null): string {
  const tipo = tipoComentario(c.texto);
  const rota = [...c.id].reduce((s, ch) => s + ch.charCodeAt(0), 0);
  if (tipo === "donde") return `¡Hola! No tenemos local: armamos cada pedido y te lo llevamos a tu casa en Carlos Paz y lo pagás al recibir. Escribinos al WhatsApp ${WHATSAPP_VISIBLE} y te lo dejamos listo 🙌`;
  if (tipo === "compra" || conDm) return `¡Hola! ${oferta ? `${oferta} ` : ""}Escribinos al WhatsApp ${WHATSAPP_VISIBLE} y te lo dejamos listo 🙌`;
  return GRACIAS[rota % GRACIAS.length];
}
const GRACIAS = ["¡Gracias! 🙌", "¡Gracias por sumarte! 🌱", "¡Qué bueno que te guste! 💛"];

/** El mensaje privado: lo que se vende hoy y el WhatsApp, donde se cierra la venta. */
export function mensajePrivado(oferta: string | null): string {
  const que = oferta ?? "Tenemos frutos secos, mixes y semillas por kilo, y te los llevamos a tu casa en Carlos Paz; pagás al recibir.";
  return `¡Hola! Te escribo por tu comentario 🙌 ${que} Para pedirlo, escribinos al WhatsApp: wa.me/549${WHATSAPP_VISIBLE.replace(/\D/g, "")} ¿Es para tu casa?`;
}

type Cambio = { field?: string; value?: Record<string, unknown> };

/** Saca los comentarios nuevos de un webhook de Instagram ("comments") o de la página ("feed"). */
export function comentariosDe(objeto: string | undefined, entradas: { changes?: Cambio[] }[]): Comentario[] {
  const out: Comentario[] = [];
  for (const e of entradas) {
    for (const ch of e.changes ?? []) {
      const v = ch.value ?? {};
      if (objeto === "instagram" && ch.field === "comments") {
        const from = v.from as { id?: string; username?: string } | undefined;
        if (typeof v.id === "string" && from?.id) {
          out.push({ canal: "instagram", id: v.id, texto: String(v.text ?? ""), autorId: from.id, autorNombre: from.username ?? null, esRespuesta: Boolean(v.parent_id) });
        }
      }
      if (objeto === "page" && ch.field === "feed" && v.item === "comment" && v.verb === "add") {
        const from = v.from as { id?: string; name?: string } | undefined;
        if (typeof v.comment_id === "string" && from?.id) {
          out.push({ canal: "facebook", id: v.comment_id, texto: String(v.message ?? ""), autorId: from.id, autorNombre: from.name ?? null, esRespuesta: Boolean(v.parent_id && v.parent_id !== v.post_id) });
        }
      }
    }
  }
  return out;
}
