// Puro (sin base): cómo se lleva el precio de lista del proveedor a cada presentación nuestra.

/**
 * La lista de La Granja trae el precio por kilo; nosotros vendemos también medio kilo y 250 g. Si el precio
 * de la lista es justo el del kilo para una presentación chica (el costo de antes × 1000/contenido, con
 * margen de ±20%), se lleva a la presentación. Así el cacao de 250 g no toma el precio del kilo (23/10).
 */
export function costoDePresentacion(precioLista: number, costoAntes: number, contenido: number | null): number {
  if (contenido && contenido > 0 && contenido < 1000 && costoAntes > 0) {
    const factor = 1000 / contenido;
    const ratio = precioLista / costoAntes;
    if (ratio > factor * 0.8 && ratio < factor * 1.2) return Math.round((precioLista * contenido) / 1000);
  }
  return Math.round(precioLista);
}


/**
 * Costos cargados a mano con la compra real del 3/11 (precios de #439). Hasta esa fecha la lista diaria no los
 * pisa: el código de lista de varios es otra variedad u otra promo (dátiles: Deglet Nour en vez de Egipto), y
 * aplicarla movía el precio de venta en la misma proporción. Pablo los revisa antes de que venza.
 */
export const COSTOS_DE_COMPRA = new Set(["TG-NUEZ", "TG-CAJU", "TG-PASAS", "TG-PASAS-500", "LG-DATIL", "LG-DATIL-500", "LG-MIXSEM", "LG-MIXSEM-500"]);
export const COSTOS_DE_COMPRA_HASTA = new Date("2026-11-17T03:00:00Z");
export function costoDeCompraVigente(codigo: string, ahora: Date = new Date()): boolean {
  return ahora < COSTOS_DE_COMPRA_HASTA && COSTOS_DE_COMPRA.has(codigo);
}
