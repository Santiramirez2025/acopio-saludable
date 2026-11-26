// Combo que existe pero hoy no se puede armar (Martín 26/11): la página responde 200 con «Hoy sin stock»,
// WhatsApp y 3 combos que sí salen, en vez de un 404. Quien llega desde un anuncio o un feed no se pierde.

/** «Dátiles con carozo x 1 kg» → «dátiles con carozo». */
export function nombreCorto(producto: string): string {
  const base = producto.replace(/\s+x\s+[\d.,]+\s*(kg|g|gr|cc|ml|l|unidades?|u)\b.*$/i, "").trim();
  return base.charAt(0).toLowerCase() + base.slice(1);
}

/** Frase honesta de por qué no está: nombra lo que falta y nunca promete un día. */
export function textoSinStock(faltan: string[] = []): string {
  const nombres = [...new Set(faltan.map(nombreCorto))].filter(Boolean);
  if (!nombres.length) return "Hoy sin stock: esta semana no lo estamos armando.";
  const lista = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
  return `Hoy sin stock: vuelve apenas tengamos de nuevo ${lista}.`;
}

export function mensajeSinStock(nombreCombo: string): string {
  return `Hola, quería el combo ${nombreCombo} que en la web figura sin stock. ¿Me avisan cuando vuelve o me ayudan a armar algo parecido?`;
}

/** Hasta 3 combos que hoy sí se venden, sin repetir el agotado, en el orden de la tienda. */
export function alternativas<C extends { slug: string; disponible: boolean }>(combos: C[], slug: string, n = 3): C[] {
  return combos.filter((c) => c.disponible && c.slug !== slug).slice(0, n);
}
