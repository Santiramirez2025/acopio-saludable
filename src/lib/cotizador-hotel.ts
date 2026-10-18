// Cotizador de desayunos para alojamientos. Puro: recibe el catálogo y devuelve cantidades.
//
// Consumo promedio por desayuno servido (huésped por día), contando que no todos comen de todo.
// Son estimaciones para arrancar: el hotel las ajusta en el carrito con + y −.

export const INSUMOS = {
  granola: { nombre: "Granola", gramos: 25, buscar: /granola/i },
  avena: { nombre: "Avena", gramos: 20, buscar: /\bavena\b/i },
  cereales: { nombre: "Copos y cereales", gramos: 25, buscar: /copos|almohadit|cereal/i },
  frutos: { nombre: "Frutos secos", gramos: 15, buscar: /mix cl[aá]sico|mix de frutos|frutos secos/i },
  miel: { nombre: "Miel", gramos: 10, buscar: /\bmiel\b/i },
  mermelada: { nombre: "Mermelada", gramos: 20, buscar: /mermelada/i },
  te: { nombre: "Té en saquitos", gramos: 0, unidades: 0.5, buscar: /^t[eé]\b|\bt[eé] (negro|verde)/i },
} as const;
export type Insumo = keyof typeof INSUMOS;
/** Lo que lleva el nombre del insumo pero no lo es («Galletas de avena y miel»). */
const NO_ES = /galleta|barrita|barra |alfajor|cookie|bud[ií]n|turr[oó]n|crocante/i;
export const INSUMO_IDS = Object.keys(INSUMOS) as Insumo[];

export type Candidato = { codigo: string; producto: string; presentacion: string; precio: number; contenido: number | null; unidad: string | null };

/** Unidades por envase cuando no hay contenido en gramos («x 25 saq.», «x12 unid»). */
export function unidadesDe(c: Candidato): number | null {
  const m = `${c.presentacion} ${c.producto}`.match(/x\s*(\d+)\s*(saq|sobres?|unid|u\b)/i);
  return m ? Number(m[1]) : null;
}

export function desayunosDe(plazas: number, ocupacionPct: number, dias: number): number {
  return Math.round(plazas * (ocupacionPct / 100) * dias);
}

/**
 * Para cada insumo elegido, el envase con el mejor precio por gramo (o por unidad) del catálogo,
 * y cuántos envases hacen falta para los desayunos del período.
 */
export function cotizarDesayunos(desayunos: number, insumos: Insumo[], catalogo: Candidato[]): { insumo: Insumo; codigo: string; cantidad: number; necesario: string }[] {
  const out: { insumo: Insumo; codigo: string; cantidad: number; necesario: string }[] = [];
  for (const id of insumos) {
    const ins = INSUMOS[id];
    const porUnidad = "unidades" in ins;
    const opciones = catalogo
      .filter((c) => ins.buscar.test(c.producto) && !NO_ES.test(c.producto) && c.precio > 0)
      .map((c) => {
        const rinde = porUnidad ? unidadesDe(c) : c.unidad === "g" || c.unidad === "ml" ? c.contenido : null;
        return rinde ? { c, rinde, costo: c.precio / rinde } : null;
      })
      .filter((x): x is { c: Candidato; rinde: number; costo: number } => Boolean(x))
    const total = desayunos * (porUnidad ? (ins as { unidades: number }).unidades : ins.gramos);
    // El que sale más barato para lo que hace falta, no el de mejor precio por kilo: una bolsa de 25 kg
    // para 7 kg de avena es más cara y se vence.
    const conCosto = opciones.map((o) => ({ ...o, cantidad: Math.max(1, Math.ceil(total / o.rinde)) })).sort((a, b) => a.cantidad * a.c.precio - b.cantidad * b.c.precio);
    const mejor = conCosto[0];
    if (!mejor) continue;
    const cantidad = mejor.cantidad;
    out.push({ insumo: id, codigo: mejor.c.codigo, cantidad, necesario: porUnidad ? `${Math.ceil(total)} saquitos` : total >= 1000 ? `${(total / 1000).toFixed(1).replace(".", ",")} kg` : `${Math.ceil(total)} g` });
  }
  return out;
}
