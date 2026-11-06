// Cómo le explica el vendedor la compra mínima a quien recién escribe.
// El 30/10 la IA le abrió a una clienta de un anuncio de Carlos Paz con «El mínimo de compra es $60.000»,
// cuando en Carlos Paz el mínimo es otro (reparto propio). Decir el mínimo general antes de saber la ciudad
// espanta al vecino de la zona, que es justo a quien le hablan los anuncios.
// Desde el 11/11, con `envioBajoMinimo`, en la zona no hay mínimo: `propia` pasa a ser el umbral del envío
// sin cargo y abajo de eso se cobra ese envío fijo. Se puede comprar con cualquier subtotal.
export function reglaMinimo(general: string, propia: string | null, envioBajoMinimo: string | null = null): string {
  if (!propia) {
    return `- La compra mínima es ${general}. Nunca la digas como un problema («te falta plata»): es la razón por la que el combo le conviene.`;
  }
  return [
    envioBajoMinimo
      ? `- La compra mínima depende de la zona: en Villa Carlos Paz y el sur de Punilla (reparto propio) NO hay compra mínima: se puede pedir cualquier monto; desde ${propia} la entrega va sin cargo y, si el pedido no llega a ${propia}, el envío cuesta ${envioBajoMinimo}. En el resto del país la compra mínima es ${general}. Nunca le digas a alguien de la zona que «le falta» para poder comprar: ofrecé sumar hasta ${propia} para que el envío salga sin cargo.`
      : `- La compra mínima depende de la zona: en Villa Carlos Paz y el sur de Punilla (reparto propio, sin cargo) es ${propia}; en el resto del país, ${general}.`,
    "  Antes de nombrar un mínimo por una localidad, mirá lo que dice costo_envio: si dice reparto propio, no hay mínimo aunque no sea Carlos Paz (San Antonio de Arredondo, Vertientes de Arredondo, Mayu Sumaj, Tanti, Bialet Massé). Nunca digas que un lugar «está fuera de Carlos Paz» para justificar un mínimo o el correo.",
    "  No digas ningún mínimo en el saludo ni antes de saber su ciudad: si hace falta, preguntá primero «¿de qué ciudad sos?». Si el anuncio por el que llegó nombra Carlos Paz, tomalo como de la zona hasta que diga otra cosa.",
    `  Nunca le digas ${general} a alguien de Carlos Paz o el sur de Punilla. Nunca la digas como un problema («te falta plata»): es la razón por la que el combo le conviene.`,
  ].join("\n");
}
