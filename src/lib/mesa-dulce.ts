/** Mesa dulce de Navidad: cantidades orientativas por persona y presupuesto con los precios vigentes. */

export type RenglonMesa = { codigo: string; gramosPorPersona: number; para: string };

// Estimación propia para una noche, con varias cosas en la mesa: cada uno prueba un poco de todo.
// Si en la mesa hay además turrones, budines o helado, se puede bajar.
export const MESA_DULCE: RenglonMesa[] = [
  { codigo: "LG-PANDULCE-CERAL", gramosPorPersona: 50, para: "una porción fina de pan dulce" },
  { codigo: "TG-MIXC-500", gramosPorPersona: 25, para: "un puñado de mix con cajú" },
  { codigo: "LG-GARRAPMANI-500", gramosPorPersona: 20, para: "garrapiñada de maní" },
  { codigo: "LG-ALMGARRAP-250", gramosPorPersona: 15, para: "almendras garrapiñadas" },
  { codigo: "LG-PASASCHOC-400", gramosPorPersona: 15, para: "pasas con chocolate" },
  { codigo: "LG-DATIL-500", gramosPorPersona: 10, para: "dos o tres dátiles" },
];

export const GRUPOS = [4, 8, 12, 20];

type Prod = { codigo: string; precio: number; contenido: number | null };

export type LineaPresupuesto = { codigo: string; gramos: number; envases: number; subtotal: number };

/** Cuántos envases hacen falta para `personas` y cuánto suma, con el precio de cada producto. */
export function presupuestoMesa(personas: number, productos: Prod[], renglones: RenglonMesa[] = MESA_DULCE) {
  const lineas: LineaPresupuesto[] = [];
  for (const r of renglones) {
    const p = productos.find((x) => x.codigo === r.codigo);
    if (!p || !p.contenido || p.contenido <= 0) continue;
    const gramos = r.gramosPorPersona * personas;
    const envases = Math.max(1, Math.ceil(gramos / p.contenido));
    lineas.push({ codigo: r.codigo, gramos, envases, subtotal: envases * p.precio });
  }
  const total = lineas.reduce((s, l) => s + l.subtotal, 0);
  return { personas, lineas, total, porPersona: personas > 0 ? total / personas : 0 };
}
