// Atribución cuando el comprador llega a la web por un link con utm (consultorio, alianza, influencer)
// y en vez de pagar en la web toca «Pedir por WhatsApp». Sin esto el pedido que arma el bot sale como
// «whatsapp» a secas y el referidor (que cobra el 10% en producto de lo que compran sus pacientes) no
// se puede liquidar. La web agrega una línea «Vengo de: …» al mensaje y el pedido la recupera.

export const MARCA = "Vengo de: ";

/** De «consultorio / caon · 2026-11-11 → instagram · 2026-11-12» saca la campaña con utm del primer origen. */
export function campaniaDeOrigen(origen: string | null | undefined): string | null {
  if (!origen) return null;
  const primero = origen.split(" → ")[0].replace(/ · \d{4}-\d{2}-\d{2}$/, "").trim();
  // Solo los links con utm (llevan « / »): «instagram», «google (orgánico)» o «web · directo» no son campañas.
  if (!primero.includes(" / ")) return null;
  return primero.replace(/[^\p{L}\p{N} /._-]/gu, "").slice(0, 60) || null;
}

/** Línea que viaja al final del mensaje de WhatsApp; vacía si no hay campaña. */
export function lineaOrigen(origen: string | null | undefined): string {
  const c = campaniaDeOrigen(origen);
  return c ? `\n${MARCA}${c}` : "";
}

/** Busca la marca en los mensajes del cliente (el más nuevo primero) y devuelve la campaña. */
export function campaniaEnMensajes(textos: string[]): string | null {
  for (const t of textos) {
    const i = t.lastIndexOf(MARCA);
    if (i < 0) continue;
    const c = t.slice(i + MARCA.length).split("\n")[0].replace(/[^\p{L}\p{N} /._-]/gu, "").trim().slice(0, 60);
    if (c.includes(" / ")) return c;
  }
  return null;
}
