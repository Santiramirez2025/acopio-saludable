// Cómo le explica el vendedor la compra mínima a quien recién escribe.
// El 30/10 la IA le abrió a una clienta de un anuncio de Carlos Paz con «El mínimo de compra es $60.000»,
// cuando en Carlos Paz el mínimo es otro (reparto propio). Decir el mínimo general antes de saber la ciudad
// espanta al vecino de la zona, que es justo a quien le hablan los anuncios.
export function reglaMinimo(general: string, propia: string | null): string {
  if (!propia) {
    return `- La compra mínima es ${general}. Nunca la digas como un problema («te falta plata»): es la razón por la que el combo le conviene.`;
  }
  return [
    `- La compra mínima depende de la zona: en Villa Carlos Paz y el sur de Punilla (reparto propio, sin cargo) es ${propia}; en el resto del país, ${general}.`,
    "  No digas ningún mínimo en el saludo ni antes de saber su ciudad: si hace falta, preguntá primero «¿de qué ciudad sos?». Si el anuncio por el que llegó nombra Carlos Paz, tomalo como de la zona hasta que diga otra cosa.",
    `  Nunca le digas ${general} a alguien de Carlos Paz o el sur de Punilla. Nunca la digas como un problema («te falta plata»): es la razón por la que el combo le conviene.`,
  ].join("\n");
}
