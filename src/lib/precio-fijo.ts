// Combos de precio único: valen lo mismo con cualquier medio de pago (sin descuento por transferencia).
// 16/11 (Santiago): el Trío a $24.000 para todos. A $22.000 por transferencia dejaba ~$4.400 y el anuncio cuesta ~$4.500 por pedido.
// Puro (sin base): se prueba sin gastar nada.

// 16/11, 22:30 (Santiago): «seguimos $22.000 por transferencia, prefiero la plata y el cliente en mano». Queda vacío: el mecanismo sigue por si se usa.
// 21/11, 20:25 (Santiago): «no cobramos más 22mil de ninguna manera». El Trío vale $24.000 con cualquier medio de pago.
export const COMBOS_PRECIO_FIJO = new Set<string>(["trio-de-frutos-secos"]);

/** Desde cuándo rige: a los pedidos anteriores se les respeta el precio por transferencia que se les dijo. */
export const PRECIO_FIJO_DESDE = new Date("2026-11-21T23:25:00Z");

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
