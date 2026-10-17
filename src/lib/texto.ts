// Textos para el público: lo que se muestra en la web y en el SEO.

/** «Sin marca / fraccionado» es un dato interno: al cliente no le dice nada y en el SEO queda feo. */
export function marcaVisible(marca: string | null | undefined): boolean {
  const m = (marca ?? "").trim().toLowerCase();
  return Boolean(m) && !/sin marca|fraccionad|granel/.test(m);
}

/** Corta un texto sin partir una palabra («…envíos a todo e»). */
export function cortarEnPalabra(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  const corte = texto.slice(0, max);
  const i = corte.lastIndexOf(" ");
  return (i > max * 0.6 ? corte.slice(0, i) : corte).replace(/[,;:\s]+$/, "");
}
