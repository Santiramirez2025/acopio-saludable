// El carrito de la web llega a WhatsApp como texto («Hola! Quiero hacer este pedido de la web: …»).
// Se arma TAL CUAL, sin pasar por la IA: antes el vendedor recortaba a 4 ítems (a Lorenzo le sacó las pasas)
// y le ofrecía combos que no había pedido.

export type LineaWeb = { cantidad: number; nombre: string; subtotal: number };

const INICIO = /^\s*hola!?\s*quiero hacer este pedido de la web:?/i;

export function esPedidoWeb(texto: string): boolean {
  return INICIO.test(texto);
}

/** «• 1 × Mix Clásico con cajú: $ 15.400» → { cantidad: 1, nombre: "Mix Clásico con cajú", subtotal: 15400 } */
export function leerPedidoWeb(texto: string): LineaWeb[] {
  const out: LineaWeb[] = [];
  for (const l of texto.split(/\n/)) {
    const m = l.match(/^\s*[•*\-]?\s*(\d+)\s*[×x]\s*(.+?):\s*\$\s*([\d.,]+)\s*$/i);
    if (!m) continue;
    const subtotal = Number(m[3].replace(/\./g, "").replace(",", "."));
    out.push({ cantidad: Number(m[1]), nombre: m[2].trim(), subtotal: Math.round(subtotal) });
  }
  return out;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

type Prod = { codigo: string; producto: string; presentacion: string; precio: number };
type Combo = { slug: string; nombre: string; precio: number; disponible: boolean };
export type Elegido = { clase: "producto" | "combo"; id: string; nombre: string; cantidad: number; precio: number };

/** Busca cada línea en el catálogo: mismo nombre y mismo precio unitario (así se distingue 500 g de 1 kg). */
export function resolverPedidoWeb(lineas: LineaWeb[], productos: Prod[], combos: Combo[]): { elegidos: Elegido[]; faltan: string[] } {
  const elegidos: Elegido[] = [];
  const faltan: string[] = [];
  for (const l of lineas) {
    const unit = l.cantidad > 0 ? l.subtotal / l.cantidad : l.subtotal;
    const n = norm(l.nombre.replace(/^combo\s+/i, ""));
    const cercaPrecio = (p: number) => Math.abs(p - unit) <= Math.max(50, unit * 0.02);
    const prods = productos.filter((p) => norm(p.producto) === n || norm(`${p.producto} ${p.presentacion}`) === n);
    const p = prods.find((x) => cercaPrecio(x.precio)) ?? (prods.length === 1 ? prods[0] : undefined);
    if (p) {
      elegidos.push({ clase: "producto", id: p.codigo, nombre: `${p.producto} ${p.presentacion}`.trim(), cantidad: l.cantidad, precio: p.precio * l.cantidad });
      continue;
    }
    const c = combos.find((x) => x.disponible && norm(x.nombre) === n);
    if (c) {
      elegidos.push({ clase: "combo", id: c.slug, nombre: `Combo ${c.nombre}`, cantidad: l.cantidad, precio: Math.round(c.precio) * l.cantidad });
      continue;
    }
    faltan.push(l.nombre);
  }
  return { elegidos, faltan };
}
