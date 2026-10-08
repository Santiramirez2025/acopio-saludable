// Lectura y validación del formulario de combos (sin base de datos, testeable).

import { normalizar } from "./clasificar";

export function slugDesdeNombre(nombre: string): string {
  return normalizar(nombre).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

/** Una línea por producto: "codigo x cantidad", "codigo, cantidad" o solo "codigo". El código es texto. */
export function leerItemsCombo(texto: string): { codigo: string; cantidad: number }[] {
  const mapa = new Map<string, number>();
  texto.split(/\r?\n/).forEach((cruda, i) => {
    const linea = cruda.trim();
    if (!linea) return;
    const m = linea.match(/^(\S+?)(?:\s*[x×,;]\s*|\s+)(\d+)$/i) ?? linea.match(/^(\S+)$/);
    if (!m) throw new Error(`Línea ${i + 1}: no se entiende "${linea}". Usá "codigo x cantidad".`);
    const cantidad = m[2] ? Number.parseInt(m[2], 10) : 1;
    if (cantidad < 1 || cantidad > 999) throw new Error(`Línea ${i + 1}: la cantidad debe estar entre 1 y 999`);
    mapa.set(m[1], Math.min(999, (mapa.get(m[1]) ?? 0) + cantidad));
  });
  return [...mapa].map(([codigo, cantidad]) => ({ codigo, cantidad }));
}
