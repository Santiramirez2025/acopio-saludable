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

const PUBLICAS_DM = ["¡Te escribimos por privado! 📩", "¡Ya te mandamos los precios por mensaje! 🙌", "¡Te respondimos por privado con todo el detalle! 🌱"];
const PUBLICAS_GRACIAS = ["¡Gracias! 🙌", "¡Gracias por sumarte! 🌱", "¡Qué bueno que te guste! 💛"];

/** Respuesta pública, rotando para que no parezcan todas iguales. */
export function respuestaPublica(c: Comentario, conDm: boolean): string {
  const lista = conDm ? PUBLICAS_DM : PUBLICAS_GRACIAS;
  return lista[[...c.id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % lista.length];
}

/** El mensaje privado: un precio real, el envío y una pregunta para que conteste. */
export function mensajePrivado(precioDespensa: string | null): string {
  const oferta = precioDespensa ? `La Despensa de 4 kilos (mix, dátiles, pasas y semillas) sale ${precioDespensa}` : "Tenemos frutos secos, mixes y despensa por kilo";
  return `¡Hola! Te escribo por tu comentario 🙌 ${oferta}, y en Carlos Paz te la llevamos sin cargo (al resto del país va por correo). ¿Es para tu casa o para un negocio?`;
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
