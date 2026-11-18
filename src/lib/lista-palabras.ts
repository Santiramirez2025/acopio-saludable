// Palabras de un renglón de «lista de productos» que sirven para buscar. Puro: se prueba sin base.
//
// 17/11, Norma (…8837): «Yo compro todos los años ….nueces,castañas ,almendras y avellanas y cerezas(hago budines
// para la flia.)». La lista salió «Yo compro todos los años ….nueces — no lo tenemos» y «Cerezas(hago budines para
// la flia.) — no lo tenemos»: para encontrar un producto tenían que coincidir TODAS las palabras del renglón, también
// «compro», «años» o «budines». Si con todas no hay nada, se busca por cada palabra que puede ser un producto.

/** Palabras que cuentan para saber si un producto es lo que pidió («harina de coco» ≠ «coco rallado»). */
export function claves(t: string): string[] {
  const VACIAS = new Set(["de", "del", "la", "el", "los", "las", "con", "sin", "x", "y", "en", "al", "para", "por", "kg", "kilo", "gr", "g", "polvo"]);
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z\s]/g, " ").split(/\s+/)
    .filter((w) => w.length > 2 && !VACIAS.has(w))
    // «nueces» → «nuez» (sin esto quedaba «nuec» y la nuez salía «no lo tenemos»).
    .map((w) => (w === "nueces" ? "nuez" : w.length > 4 ? w.replace(/(es|s)$/, "") : w));
}

// Lo que la gente escribe alrededor del producto y nunca es un producto (ya pasado por claves()).
const PROSA = new Set([
  "yo", "compro", "compra", "comprar", "compramos", "quiero", "queria", "quisiera", "necesito", "busco", "tengo", "tenes", "tienen",
  "hago", "hacer", "para", "todo", "toda", "siempre", "ano", "anos", "año", "año", "vez", "veces", "mes", "semana", "flia", "familia",
  "budin", "budine", "torta", "receta", "precio", "cuanto", "sale", "salen", "vale", "mas", "menos", "algo", "tambien", "pero",
  "bien", "hola", "gracia", "buena", "buen", "dia", "tarde", "noche", "favor", "porfa", "uno", "una", "unos", "unas", "medio",
]);

/** Palabras sueltas para buscar de respaldo, en el orden en que aparecen, sin la prosa de alrededor. */
export function palabrasDeRespaldo(renglon: string): string[] {
  return [...new Set(claves(renglon).filter((w) => !PROSA.has(w)))];
}
