// Cuando el anuncio que tocó la persona muestra un combo que hoy no hay (la Despensa sin almendra, 11/11),
// el bot decía «no la tenemos, ¿para qué la buscabas?» y la charla moría: 8 charlas del anuncio en 2 horas,
// 0 pedidos hasta que una persona les ofreció el Trío. Acá se elige el combo disponible más parecido
// (el que comparte más productos con el del anuncio) para ofrecerlo en el primer mensaje.

type Item = { producto: { codigo: string } };
type Combo = { slug: string; nombre: string; disponible: boolean; precio: number; items: Item[] };

/** Combo disponible que comparte más productos con el agotado; a igualdad, el de precio más cercano. Null si no comparte ninguno. */
export function comboParecido<C extends Combo>(agotado: C, combos: C[]): C | null {
  const suyos = new Set(agotado.items.map((i) => i.producto.codigo));
  let mejor: C | null = null;
  let puntos = 0;
  for (const c of combos) {
    if (!c.disponible || c.slug === agotado.slug) continue;
    const comunes = new Set(c.items.map((i) => i.producto.codigo).filter((x) => suyos.has(x))).size;
    if (!comunes) continue;
    if (comunes > puntos || (comunes === puntos && mejor && Math.abs(c.precio - agotado.precio) < Math.abs(mejor.precio - agotado.precio))) {
      mejor = c;
      puntos = comunes;
    }
  }
  return mejor;
}
