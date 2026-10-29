// Precio mayorista por producto: la escalera (−10% desde 5 kg, −15% desde 10 kg) sobre la lista de la tienda,
// pero nunca por debajo del piso de ganancia (costo + 25%). Almendras, cajú, maní, banana chips y ciruelas
// van con −10% fijo (regla de Leo y Santiago, por margen). Si el piso no deja llegar al escalón, el
// descuento se recorta a lo que el piso permite (puede ser 0: va a precio de lista).

/** Recargo mínimo sobre el costo para vender por mayor (25%). */
export const PISO_MAYORISTA_SOBRE_COSTO = 0.25;

// Por el comienzo del nombre: «Mix de cajú y banana» o «Harina de maní» siguen la escalera (mixes incluidos).
const FIJO_10 = /^(almendr|casta[nñ]as? (de )?caj|caj[uú]|man[ií](\s|$)|banana|ciruel)/i;

/** Tope de descuento por tipo de producto: los de −10% fijo no entran en la escalera. */
export function topeEscalon(producto: string, escalonPct: number): number {
  return FIJO_10.test(producto) ? Math.min(10, escalonPct) : escalonPct;
}

const redondo = (n: number) => Math.round(n / 100) * 100;

/**
 * Precio mayorista de un producto para un escalón. Devuelve el precio redondeado a $100 y el descuento
 * que realmente se aplicó (entero). Nunca queda por debajo de costo × 1,25.
 */
export function precioMayorista(precioLista: number, costo: number, producto: string, escalonPct: number): { precio: number; pct: number } {
  const tope = topeEscalon(producto, escalonPct);
  if (!(precioLista > 0)) return { precio: 0, pct: 0 };
  const piso = costo > 0 ? costo * (1 + PISO_MAYORISTA_SOBRE_COSTO) : 0;
  for (let pct = tope; pct > 0; pct--) {
    const precio = redondo(precioLista * (1 - pct / 100));
    if (precio >= piso) return { precio, pct };
  }
  return { precio: redondo(precioLista), pct: 0 };
}
