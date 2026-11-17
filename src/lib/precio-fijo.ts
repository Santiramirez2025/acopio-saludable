// Combos de precio único: valen lo mismo con cualquier medio de pago (sin descuento por transferencia).
// 16/11 (Santiago): el Trío a $24.000 para todos. A $22.000 por transferencia dejaba ~$4.400 y el anuncio cuesta ~$4.500 por pedido.
// Puro (sin base): se prueba sin gastar nada.

export const COMBOS_PRECIO_FIJO = new Set<string>(["trio-de-frutos-secos"]);

/** Desde cuándo rige: a los pedidos anteriores se les respeta el precio por transferencia que se les dijo. */
export const PRECIO_FIJO_DESDE = new Date("2026-11-17T01:00:00Z");

export function esPrecioFijo(slug: string | null | undefined): boolean {
  return !!slug && COMBOS_PRECIO_FIJO.has(slug);
}

/** El descuento por transferencia que le toca a un combo: 0 si es de precio único. */
export function pctTransferenciaCombo(slug: string | null | undefined, pct: number): number {
  return esPrecioFijo(slug) ? 0 : pct;
}

/** La parte del subtotal que sí lleva descuento por transferencia: todo menos los renglones de combos de precio único. */
export function baseTransferencia(renglones: { comboSlug?: string | null; importe: number }[]): number {
  return Math.round(renglones.filter((r) => !esPrecioFijo(r.comboSlug)).reduce((s, r) => s + r.importe, 0) * 100) / 100;
}
