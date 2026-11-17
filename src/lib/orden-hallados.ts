// Orden de los productos que encontró la búsqueda del vendedor. Puro: se prueba sin base.

/** Lo propio (Todo Granolas, La Granja) va antes, y entre lo propio, del más barato al más caro: es lo que promete el anuncio. */
const propio = (p: { codigo: string }) => (/^(TG|LG)-/.test(p.codigo) ? 1 : 0);

/**
 * Orden de lo que se encontró: más puntos primero; a igual puntaje, lo que tenemos EN MANO antes que lo POR ENCARGO,
 * después lo nuestro (TG-/LG-) y, entre lo nuestro, lo más barato.
 *
 * 17/11, Gladys (AS-111, $56.800, el pedido más grande abierto): pidió «1kg. Nueces» y el vendedor le dijo «la nuez
 * en kilo no la tenemos en mano; la de 250 g es por encargo». Falso: TG-NUEZ estaba en stock. Con «nuez» empatan
 * una docena de productos (nuez moscada, cuartillos, 250 g, bolsa de 10 kg…), casi todos por encargo desde el 14/11;
 * el vendedor ve solo los 6 primeros y TG-NUEZ quedaba afuera. Desistió («iba por las nueces»).
 */
export function ordenarHallados<T extends { codigo: string; precio: number; encargo?: boolean }>(filas: { p: T; i: number; s: number }[]): T[] {
  const enMano = (p: T) => (p.encargo ? 0 : 1);
  return [...filas]
    .sort((a, b) => b.s - a.s || enMano(b.p) - enMano(a.p) || propio(b.p) - propio(a.p) || (propio(a.p) && propio(b.p) ? a.p.precio - b.p.precio : 0) || a.i - b.i)
    .map((x) => x.p);
}
