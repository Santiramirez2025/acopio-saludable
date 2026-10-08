// Armador de pedido: a partir de un pedido base y candidatos, devuelve cantidades que
// llegan a la compra mínima y respetan el presupuesto. Función pura, sin base de datos.

export type ItemArmador = { codigo: string; precio: number; cantidad: number };

export function factorPorPersonas(personas: number): number {
  if (personas <= 10) return 1;
  if (personas <= 30) return 1.5;
  if (personas <= 60) return 2.5;
  return 4;
}

const total = (items: ItemArmador[]) => items.reduce((s, i) => s + i.precio * i.cantidad, 0);

export function armarPedido(args: {
  base: ItemArmador[];
  candidatos: { codigo: string; precio: number }[];
  personas: number;
  presupuesto: number;
  compraMinima: number;
}): ItemArmador[] {
  const techo = Math.max(args.compraMinima, args.presupuesto);
  const factor = factorPorPersonas(args.personas);
  const vistos = new Set<string>();
  let items: ItemArmador[] = [];
  for (const b of args.base) {
    if (b.precio <= 0 || vistos.has(b.codigo)) continue;
    vistos.add(b.codigo);
    items.push({ codigo: b.codigo, precio: b.precio, cantidad: Math.max(1, Math.ceil(b.cantidad * factor)) });
  }
  // Sin pedido base (o muy corto): se completa con los recomendados del nicho.
  for (const c of args.candidatos) {
    if (items.length >= 10) break;
    if (c.precio <= 0 || vistos.has(c.codigo)) continue;
    vistos.add(c.codigo);
    items.push({ codigo: c.codigo, precio: c.precio, cantidad: 1 });
  }
  if (!items.length) return [];

  // Si se pasa del techo: achicar en proporción y, si hace falta, sacar unidades de lo más caro.
  if (total(items) > techo) {
    const k = techo / total(items);
    items = items.map((i) => ({ ...i, cantidad: Math.max(1, Math.floor(i.cantidad * k)) }));
    const porPrecio = [...items].sort((a, b) => b.precio - a.precio);
    let cambio = true;
    while (total(items) > techo && cambio) {
      cambio = false;
      for (const i of porPrecio) {
        if (total(items) <= techo) break;
        if (i.cantidad > 1 && total(items) - i.precio >= args.compraMinima) {
          i.cantidad--;
          cambio = true;
        }
      }
    }
    // Si ya está todo en 1 unidad y sigue pasado, se sacan productos enteros empezando por el más caro.
    for (const i of porPrecio) {
      if (total(items) <= techo || items.length <= 3) break;
      if (total(items) - i.precio * i.cantidad >= args.compraMinima) items = items.filter((x) => x !== i);
    }
  }

  // Completar: primero hasta la compra mínima (obligatorio), después hasta donde dé el presupuesto.
  const baratos = [...items].sort((a, b) => a.precio - b.precio);
  let guardia = 0;
  while (total(items) < args.compraMinima && guardia++ < 100000) {
    for (const i of baratos) {
      const falta = args.compraMinima - total(items);
      if (falta <= 0) break;
      if (i.precio >= falta) {
        // Esta unidad ya cruza el mínimo: se cierra con el producto más barato que alcance, para no pasarse de largo.
        baratos.find((x) => x.precio >= falta)!.cantidad++;
        break;
      }
      i.cantidad++;
    }
  }
  let sumo = true;
  while (sumo && guardia++ < 100000) {
    sumo = false;
    for (const i of baratos) {
      if (total(items) + i.precio <= techo * 0.98) {
        i.cantidad++;
        sumo = true;
      }
    }
  }
  return items;
}
