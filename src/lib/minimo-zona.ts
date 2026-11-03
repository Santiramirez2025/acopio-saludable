// Cómo se cuenta la compra mínima según la zona, en un solo lugar: la tienda, el bot y las páginas
// locales dicen lo mismo. Desde el 11/11 en Villa Carlos Paz y el sur de Punilla (reparto propio) no hay
// compra mínima: el pedido que no llega a `compraMinimaPropia` paga un envío fijo (`envioBajoMinimo`) y
// desde ahí va sin cargo. Con `envioBajoMinimo` en 0 vuelve a regir el mínimo obligatorio de la zona.
// Para el resto del país no cambia nada: sigue `compraMinima`.

import { pesos } from "./precios";

export type ReglaMinimo = { compraMinima: number; compraMinimaPropia: number; envioBajoMinimo: number; entregaPropiaActiva: boolean };

/** El umbral de la zona propia: hasta ahí es el mínimo (o el envío sin cargo), nunca más alto que el general. */
export function umbralZona(c: ReglaMinimo): number {
  return Math.min(c.compraMinimaPropia, c.compraMinima);
}

/** La zona propia compra sin mínimo: hay envío fijo por debajo del umbral. */
export function zonaSinMinimo(c: ReglaMinimo): boolean {
  return c.entregaPropiaActiva && c.envioBajoMinimo > 0;
}

/** Cuánto sale el envío propio para ese subtotal: sin cargo desde el umbral; abajo, el fijo (si hay). */
export function envioPropioPara(c: ReglaMinimo, subtotal: number): number {
  return zonaSinMinimo(c) && subtotal < umbralZona(c) ? c.envioBajoMinimo : 0;
}

/** Una frase, para FAQ y bot: la regla completa de la zona propia cuando no hay mínimo. */
export function textoZonaSinMinimo(c: ReglaMinimo): string {
  return `En Villa Carlos Paz y el sur de Punilla no hay compra mínima: la entrega es sin cargo desde ${pesos(umbralZona(c))} y, si el pedido no llega, el envío cuesta ${pesos(c.envioBajoMinimo)}.`;
}

/** Una línea corta, para fichas y páginas de la tienda: el mínimo de $ X nunca aparece solo si la zona no lo tiene. */
export function lineaCompraMinima(c: ReglaMinimo, combinando = "los productos"): string {
  const general = `${pesos(c.compraMinima)} por pedido, combinando ${combinando} que quieras.`;
  if (zonaSinMinimo(c)) return `En Villa Carlos Paz y la zona no hay compra mínima: sin cargo desde ${pesos(umbralZona(c))}. Al resto del país, compra mínima de ${general}`;
  return `Compra mínima de ${general}`;
}

/** La compra mínima explicada entera: zona propia (si no tiene mínimo) + resto del país. */
export function textoCompraMinima(c: ReglaMinimo): string {
  const general = `${pesos(c.compraMinima)} por pedido, combinando los productos y combos que quieras.`;
  if (zonaSinMinimo(c)) return `${textoZonaSinMinimo(c)} Para envíos al resto del país la compra mínima es ${general}`;
  const propia = c.entregaPropiaActiva && c.compraMinimaPropia < c.compraMinima ? ` En Villa Carlos Paz y el sur de Punilla (reparto propio), ${pesos(c.compraMinimaPropia)}.` : "";
  return `${general}${propia}`;
}
