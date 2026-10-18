// Puro: sin base ni red, para poder probarlo.

/**
 * Nombres y presentaciones como los escribiría una persona: los del proveedor vienen pegados
 * y en mayúsculas («x1kg-DEAN FUNES», «x100 Grs-DEAN FUNES») y en un pedido armado se ven descuidados.
 */
export function prolijo(t: string): string {
  return t
    .replace(/\s*-\s*(?=[A-ZÁÉÍÓÚÑ]{3})/g, " · ")
    .replace(/\b([A-ZÁÉÍÓÚÑ]{4,})\b/g, (w) => w.charAt(0) + w.slice(1).toLowerCase())
    .replace(/\bx\s*(\d)/gi, "x $1")
    .replace(/(\d)\s*(kg|kilos?|grs?|g|cc|ml|lts?|l)\b/gi, (_, n, u) => `${n} ${/^gr/i.test(u) ? "g" : /^kilo/i.test(u) ? "kg" : u.toLowerCase()}`)
    .replace(/\s{2,}/g, " ")
    .trim();
}
