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

