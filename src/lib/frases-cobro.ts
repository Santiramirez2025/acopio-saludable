// Frases de cobro que el bot no puede decir (política del 3/11 y Santiago 14/11): «ver antes de pagar» y
// «lo ves en tu puerta» prometen algo que no es así (el pedido se paga antes de salir, o al recibir solo en la zona).
// El prompt ya lo prohíbe, pero el 18/11 a Alfredo (AS-125) el bot le escribió «¿Querés que te pase el detalle
// para ver antes de pagar?». Se saca del texto antes de mandarlo. Puro: se prueba sin base.

const FRASES: RegExp[] = [
  /,?\s*(?:y )?(?:así |para que |para )?(?:lo |la |los |las )?(?:ver|ves|veas|vés|mirar|mires|revis(?:ar|es))(?: (?:bien|todo|el pedido|la mercader[ií]a))? antes de pagar(?:lo|la)?/gi,
  /,?\s*(?:y )?(?:lo |la )?(?:ves|ves vos|mirás|revisás) en (?:tu|la) puerta/gi,
];

/** Saca las frases prohibidas sin romper la oración («…el detalle para ver antes de pagar?» → «…el detalle?»). */
export function sinFrasesDeCobroProhibidas(texto: string): string {
  let t = texto;
  for (const re of FRASES) t = t.replace(re, "");
  return t.replace(/ {2,}/g, " ").replace(/\s+([?.!,])/g, "$1");
}
