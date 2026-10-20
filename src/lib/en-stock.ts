// Lo que tenemos en mano (compra a La Granja del 20/10/2026), para la venta adicional.
//
// Regla comercial: primero se cierra lo que el cliente vino a buscar. Recién con eso resuelto,
// y si la charla da, se ofrece UNA cosa de acá que combine con lo que lleva. Por eso esto no
// decide cuándo ofrecer: solo qué conviene ofrecer y a qué precio, con datos reales del catálogo.
//
// Cuando entra mercadería nueva o se termina algo, se actualiza esta lista.

type Item = { id: string; nombre: string; busca: RegExp; excluir?: RegExp; marca?: RegExp; gancho: string };

export const EN_STOCK: Item[] = [
  { id: "mix", nombre: "Mixes propios", busca: /^mix\b/i, excluir: /semilla|cervecero|premium|tropical con/i, gancho: "los armamos en el día" },
  { id: "nuez", nombre: "Nuez mariposa", busca: /\bnuez\b|\bnueces\b/i, excluir: /mix|granola|alfajor|barra|pasta|harina|aceite/i, gancho: "recién llegada, cosecha nueva" },
  { id: "almendra", nombre: "Almendras", busca: /almendra/i, excluir: /mix|granola|leche|bebida|pasta|harina|alfajor|barra/i, gancho: "Non Pareil, las grandes" },
  { id: "caju", nombre: "Castañas de cajú", busca: /caj[uú]/i, excluir: /mix|granola|alfajor|barra|pasta/i, gancho: "enteras, recién llegadas" },
  { id: "pasas", nombre: "Pasas de uva", busca: /^pasas/i, gancho: "negras y rubias, sin semilla" },
  { id: "datil", nombre: "Dátiles", busca: /d[aá]til/i, excluir: /mix|barra|alfajor/i, gancho: "Deglet Nour, los más dulces" },
  { id: "miel", nombre: "Miel", busca: /\bmiel\b/i, excluir: /granola|barra|alfajor|galle|mostaza/i, gancho: "pura, de Los Dos Zánganos" },
  { id: "granola", nombre: "Granola", busca: /granola/i, marca: /marcilli|olimar/i, gancho: "para el desayuno" },
  { id: "avena", nombre: "Avena", busca: /avena/i, excluir: /granola|barra|galle|bebida|leche/i, marca: /marcilli/i, gancho: "arrollada fina" },
  { id: "cacao", nombre: "Cacao amargo", busca: /cacao/i, excluir: /granola|barra|alfajor|galle|mix/i, gancho: "para el licuado o la avena" },
  { id: "chia", nombre: "Chía", busca: /ch[ií]a/i, excluir: /mix|granola|barra|galle/i, gancho: "para el yogur" },
  { id: "girasol", nombre: "Girasol pelado", busca: /girasol/i, excluir: /mix|aceite|granola/i, gancho: "para ensaladas y picar" },
  { id: "banana", nombre: "Banana chips", busca: /banana/i, excluir: /mix|granola|barra/i, gancho: "crocantes, para picar" },
  { id: "natuzen", nombre: "Natuzen sin TACC", busca: /./, marca: /natuzen/i, gancho: "sin TACC" },
  { id: "discos", nombre: "Discos de arroz", busca: /disco/i, gancho: "livianos, para la merienda" },
];

/** Qué combina con qué: lo que se ofrece según lo que ya lleva. */
const COMBINA: { si: RegExp; ofrecer: string[] }[] = [
  { si: /granola|avena|desayuno|yogur|miel/i, ofrecer: ["miel", "chia", "banana", "cacao", "granola"] },
  { si: /sin tacc|celia|natuzen|cuman[aá]/i, ofrecer: ["natuzen", "discos", "miel"] },
  { si: /gym|prote|barra/i, ofrecer: ["avena", "cacao", "almendra", "banana"] },
  { si: /picada|cervecero|man[ií]|snack/i, ofrecer: ["caju", "almendra", "banana", "girasol"] },
  { si: /mix|nuez|nueces|almendra|caj[uú]|despensa|alacena|frutos secos|pasas/i, ofrecer: ["datil", "nuez", "almendra", "caju", "banana"] },
];
const POR_DEFECTO = ["nuez", "datil", "miel", "almendra"];

type Prod = { codigo: string; producto: string; marca: string; presentacion: string; precio: number; sinTacc?: boolean };

/** Los productos del catálogo que corresponden a un ítem en stock (el más barato primero: el de 500 g si existe). */
export function productosDe(item: Item, catalogo: Prod[]): Prod[] {
  return catalogo
    .filter((p) => p.precio > 0 && item.busca.test(p.producto) && !(item.excluir?.test(p.producto)) && (!item.marca || item.marca.test(p.marca)) && !/todo granolas/i.test(p.marca))
    .sort((a, b) => a.precio - b.precio);
}

/**
 * Hasta `cuantos` sugerencias del stock que combinen con lo que lleva, sin repetir lo que ya está en el pedido.
 * `pedido` es texto libre: nombres de lo que lleva o de lo que vino a buscar.
 */
export function sugerirDelStock(pedido: string, catalogo: Prod[], cuantos = 2, soloSinTacc = false): { item: Item; producto: Prod }[] {
  const orden = [...(COMBINA.filter((c) => c.si.test(pedido)).flatMap((c) => c.ofrecer)), ...POR_DEFECTO, ...EN_STOCK.map((i) => i.id)];
  const vistos = new Set<string>();
  const out: { item: Item; producto: Prod }[] = [];
  for (const id of orden) {
    if (vistos.has(id) || out.length >= cuantos) continue;
    vistos.add(id);
    const item = EN_STOCK.find((i) => i.id === id);
    if (!item) continue;
    // Si ya lo lleva, no se lo ofrecemos de nuevo.
    if (item.busca.source !== "." ? item.busca.test(pedido) : item.marca?.test(pedido)) continue;
    const p = productosDe(item, catalogo).filter((x) => !soloSinTacc || x.sinTacc)[0];
    if (p) out.push({ item, producto: p });
  }
  return out;
}

/** ¿Este producto está entre lo que tenemos en mano? Es la misma regla que usa el vendedor. */
export function estaEnStock(p: { producto: string; marca: string }): boolean {
  return !/todo granolas/i.test(p.marca) && EN_STOCK.some((i) => i.busca.test(p.producto) && !i.excluir?.test(p.producto) && (!i.marca || i.marca.test(p.marca)));
}

/** Todo lo que está en stock, en el orden de la vidriera (lo que más vende primero) y del más chico al más grande. */
export function vidrieraDeStock<P extends Prod & { fotoUrl?: string | null }>(catalogo: P[], unoPorItem = false): P[] {
  const out: P[] = [];
  const vistos = new Set<string>();
  for (const item of EN_STOCK) {
    const suyos = (productosDe(item, catalogo) as P[]).filter((p) => !vistos.has(p.codigo));
    // En la vidriera de la home va uno por producto, el que tiene foto y el de 1 kg si existe.
    const elegidos = unoPorItem ? suyos.sort((a, b) => Number(Boolean(b.fotoUrl)) - Number(Boolean(a.fotoUrl))).slice(0, 1) : suyos;
    for (const p of elegidos) { vistos.add(p.codigo); out.push(p); }
  }
  return out;
}
