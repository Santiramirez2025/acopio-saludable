// Cómo se cuenta la compra mínima según la zona, en un solo lugar: la tienda, el bot y las páginas
// locales dicen lo mismo. Desde el 11/11 en Villa Carlos Paz y el sur de Punilla (reparto propio) no hay
// compra mínima: el pedido que no llega a `compraMinimaPropia` paga un envío fijo (`envioBajoMinimo`) y
// desde ahí va sin cargo. Con `envioBajoMinimo` en 0 vuelve a regir el mínimo obligatorio de la zona.
// Para el resto del país no cambia nada: sigue `compraMinima`.

import { pesos } from "./precios";
import { VECINAS_CON_CARGO } from "./envios/vecinas";

export type ReglaMinimo = { compraMinima: number; compraMinimaPropia: number; envioBajoMinimo: number; entregaPropiaActiva: boolean };

/** El umbral de la zona propia: hasta ahí es el mínimo (o el envío sin cargo), nunca más alto que el general. */
export function umbralZona(c: ReglaMinimo): number {
  return Math.min(c.compraMinimaPropia, c.compraMinima);
}

/** Con qué piso se arman los pedidos sugeridos (armador, lista del mes, cotizador): el umbral de la zona si no hay mínimo, si no el general. */
export function minimoParaArmar(c: ReglaMinimo): number {
  return zonaSinMinimo(c) ? umbralZona(c) : c.compraMinima;
}

/** La zona propia compra sin mínimo: hay envío fijo por debajo del umbral. */
export function zonaSinMinimo(c: ReglaMinimo): boolean {
  return c.entregaPropiaActiva && c.envioBajoMinimo > 0;
}

/** Cuánto sale el envío propio para ese subtotal: sin cargo desde el umbral; abajo, el fijo (si hay). */
export function envioPropioPara(c: ReglaMinimo, subtotal: number): number {
  return zonaSinMinimo(c) && subtotal < umbralZona(c) ? c.envioBajoMinimo : 0;
}

/** Cuánto sale la entrega propia, sin nombrar la zona: «sin cargo desde $ X; abajo de eso, $ Y». Para páginas y FAQ. */
export function costoEntregaZona(c: ReglaMinimo): string {
  return zonaSinMinimo(c) ? `sin cargo desde ${pesos(umbralZona(c))}; abajo de eso, ${pesos(c.envioBajoMinimo)}` : "sin cargo";
}

/** Donde la entrega propia va sin cargo desde el umbral (Santiago, 16/11: «solo Carlos Paz es gratis, y San Antonio de Arredondo y por acá cerca»). */
export const ZONA_SIN_CARGO = "Villa Carlos Paz y San Antonio de Arredondo (hasta 8 km del centro)";

const enumerar = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}` : xs[0] ?? "");

/** El resto de la zona, con su cargo fijo por pedido: «Icho Cruz, Cuesta Blanca y Tala Huasi, $ 4.000; Tanti, …, $ 5.000». */
export function textoVecinasConCargo(): string {
  return VECINAS_CON_CARGO.map((v) => `${enumerar(v.lugares)}, ${pesos(v.cargo)}`).join("; ");
}

/** Entrega propia completa para páginas y FAQ: dónde va sin cargo y cuánto pagan las vecinas (regla del 16/11). */
export function textoEntregaZona(c: ReglaMinimo): string {
  return `En ${ZONA_SIN_CARGO}, ${costoEntregaZona(c)}. Al resto de la zona te lo llevamos con un costo fijo por pedido: ${textoVecinasConCargo()}.`;
}

/** Una frase, para FAQ y páginas: la regla completa de la zona propia cuando no hay mínimo. */
export function textoZonaSinMinimo(c: ReglaMinimo): string {
  return `En Villa Carlos Paz y la zona no hay compra mínima. En ${ZONA_SIN_CARGO} la entrega es sin cargo desde ${pesos(umbralZona(c))} y, si el pedido no llega, cuesta ${pesos(c.envioBajoMinimo)}; al resto de la zona, con un costo fijo según la localidad.`;
}

/** Una línea corta, para fichas y páginas de la tienda: el mínimo de $ X nunca aparece solo si la zona no lo tiene. */
export function lineaCompraMinima(c: ReglaMinimo, combinando = "los productos"): string {
  const general = `${pesos(c.compraMinima)} por pedido, combinando ${combinando} que quieras.`;
  if (zonaSinMinimo(c)) return `En Villa Carlos Paz y la zona no hay compra mínima; en Villa Carlos Paz, sin cargo desde ${pesos(umbralZona(c))}. Al resto del país, compra mínima de ${general}`;
  return `Compra mínima de ${general}`;
}

/** La compra mínima explicada entera: zona propia (si no tiene mínimo) + resto del país. */
export function textoCompraMinima(c: ReglaMinimo): string {
  const general = `${pesos(c.compraMinima)} por pedido, combinando los productos y combos que quieras.`;
  if (zonaSinMinimo(c)) return `${textoZonaSinMinimo(c)} Para envíos al resto del país la compra mínima es ${general}`;
  const propia = c.entregaPropiaActiva && c.compraMinimaPropia < c.compraMinima ? ` En Villa Carlos Paz y el sur de Punilla (reparto propio), ${pesos(c.compraMinimaPropia)}.` : "";
  return `${general}${propia}`;
}
