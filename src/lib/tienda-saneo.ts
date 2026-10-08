// Validación de las líneas del carrito que llegan del navegador (sin dependencias).

export type LineaEntrada = { tipo: "producto" | "combo"; id: string; cantidad: number };

export const MAX_LINEAS = 200;
export const MAX_CANTIDAD = 999;

/** Limpia lo que manda el navegador: tipos válidos, ids como texto, cantidades enteras acotadas, sin duplicados. */
export function sanearLineas(entrada: unknown): LineaEntrada[] {
  if (!Array.isArray(entrada)) return [];
  const mapa = new Map<string, LineaEntrada>();
  for (const l of entrada.slice(0, MAX_LINEAS * 2)) {
    if (!l || typeof l !== "object") continue;
    const { tipo, id, cantidad } = l as Record<string, unknown>;
    if ((tipo !== "producto" && tipo !== "combo") || typeof id !== "string" || !id || id.length > 80) continue;
    const n = Math.floor(Number(cantidad));
    if (!Number.isFinite(n) || n < 1) continue;
    const clave = `${tipo}:${id}`;
    const previa = mapa.get(clave);
    mapa.set(clave, { tipo, id, cantidad: Math.min(MAX_CANTIDAD, (previa?.cantidad ?? 0) + n) });
    if (mapa.size >= MAX_LINEAS) break;
  }
  return [...mapa.values()];
}

