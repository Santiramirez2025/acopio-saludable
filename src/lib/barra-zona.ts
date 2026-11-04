// Qué dice la barra del carrito cuando Villa Carlos Paz y la zona no tienen compra mínima: se mide contra el envío
// sin cargo de la zona, nunca contra los $60.000 de otras localidades (eso queda en una nota aparte).

export type BarraZona = { pct: number; meta: number; falta: number; llego: boolean; faltaOtras: number };

export function barraZona(subtotal: number, umbral: number, compraMinima: number): BarraZona {
  const falta = Math.max(0, umbral - subtotal);
  return { pct: umbral > 0 ? Math.min(100, Math.round((subtotal / umbral) * 100)) : 100, meta: umbral, falta, llego: falta === 0, faltaOtras: Math.max(0, compraMinima - subtotal) };
}
