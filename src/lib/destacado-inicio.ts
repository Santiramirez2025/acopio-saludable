// Qué va en la tarjeta de la primera pantalla del inicio y qué combos van primero en /combos.
// Orden de Laura 10/11 (sin almendra): lo que se empuja son el Trío del desayuno y el Pan dulce casero.
// Mientras el mix de la casa esté sin stock, la tarjeta del inicio muestra el Trío (pasa los $20.000
// y en Carlos Paz va sin cargo) en vez de las pasas sueltas a $5.900 (que pagan $3.000 de envío).

/** Combos que se empujan esta semana, en este orden. Si uno no se puede vender, se saltea. */
export const COMBOS_DE_LA_SEMANA = ["trio-de-frutos-secos", "trio-del-desayuno", "pan-dulce-casero"] as const;

/** El mix de la casa (orden de Santiago 4/11) y lo que va si no está. */
export const DESTACADO_PRODUCTO = "TG-MIXC";
export const DESTACADO_SI_FALTA = "TG-PASAS";

type ConCodigo = { codigo: string };
type ConSlug = { slug: string; disponible: boolean };

export type EleccionDestacado<P, C> = { tipo: "producto"; p: P; esLaCasa: boolean } | { tipo: "combo"; c: C } | null;

/** Mix de la casa si se vende; si no, el primer combo de la semana disponible; si no, las pasas. */
export function elegirDestacado<P extends ConCodigo, C extends ConSlug>(productos: P[], combos: C[]): EleccionDestacado<P, C> {
  const mix = productos.find((x) => x.codigo === DESTACADO_PRODUCTO);
  if (mix) return { tipo: "producto", p: mix, esLaCasa: true };
  for (const slug of COMBOS_DE_LA_SEMANA) {
    const c = combos.find((x) => x.slug === slug && x.disponible);
    if (c) return { tipo: "combo", c };
  }
  const resto = productos.find((x) => x.codigo === DESTACADO_SI_FALTA) ?? productos[0];
  return resto ? { tipo: "producto", p: resto, esLaCasa: false } : null;
}

/** Los combos de la semana primero (en su orden) y después el resto como venían. */
export function ordenarCombos<C extends { slug: string }>(combos: C[]): C[] {
  const rango = (s: string) => {
    const i = (COMBOS_DE_LA_SEMANA as readonly string[]).indexOf(s);
    return i === -1 ? COMBOS_DE_LA_SEMANA.length : i;
  };
  return combos.map((c, i) => ({ c, i })).sort((a, b) => rango(a.c.slug) - rango(b.c.slug) || a.i - b.i).map((x) => x.c);
}
