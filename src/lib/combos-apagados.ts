// Combos que se apagan solos por un cambio automático de stock (23/11, Martín).
//
// El 23/11 el robot de la web de La Granja pausó los dátiles a las 7:40 y el Trío (casi todas las ventas) quedó
// «no disponible» toda la mañana con los anuncios prendidos: nadie se enteró hasta que el bot mostró «Total: $0».
// Esto compara qué combos se vendían antes y después de la corrida automática y, si alguno se apagó, le avisa a
// Santiago con el producto que lo apagó. No reactiva nada: decidir el stock es de él.

export type ComboEstado = { slug: string; nombre: string; disponible: boolean; items: { producto: { codigo: string; producto: string; presentacion: string } }[] };

/** Combos que estaban a la venta antes y ya no, con los productos pausados que los apagaron. Puro. */
export function combosQueSeApagaron(
  antes: ComboEstado[],
  despues: ComboEstado[],
  pausados: string[],
): { slug: string; nombre: string; culpables: string[] }[] {
  const estaban = new Set(antes.filter((c) => c.disponible).map((c) => c.slug));
  const p = new Set(pausados);
  return despues
    .filter((c) => estaban.has(c.slug) && !c.disponible)
    .map((c) => ({
      slug: c.slug,
      nombre: c.nombre,
      culpables: c.items.filter((i) => p.has(i.producto.codigo)).map((i) => `${i.producto.producto} ${i.producto.presentacion}`.trim()),
    }));
}

/** Texto del aviso para Santiago (null si no se apagó nada). */
export function avisoCombosApagados(apagados: ReturnType<typeof combosQueSeApagaron>, motivo: string): string | null {
  if (!apagados.length) return null;
  const lineas = apagados.map((c) => `· ${c.nombre}${c.culpables.length ? ` (por: ${c.culpables.join(", ")})` : ""}`);
  return [
    `⚠️ Se dejaron de vender ${apagados.length === 1 ? "un combo" : `${apagados.length} combos`} recién: ${motivo}.`,
    ...lineas,
    "Si hay mercadería en casa, reactivá el producto en /admin/productos (puesto a mano no lo vuelve a pausar el robot).",
  ].join("\n");
}
