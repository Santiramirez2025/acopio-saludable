// Lo que Google y Merchant Center leen de un combo: título, descripción y texto alternativo,
// siempre con el precio vigente y la composición real. Sin Prisma, para poder probarlo.
import { medida, pesos } from "./precios";

type Item = { producto: { producto: string; contenido: number | null; unidad: string | null }; cantidad: number };
type Combo = { nombre: string; precio: number; ahorro: number; items: Item[] };

const MAX_DESCRIPCION = 155;
const sinEspacioDuro = (t: string) => t.replace(/ /g, " ");
const nombreCorto = (p: string) => p.replace(/\s*\(.*?\)/g, "").replace(/\s+x\s*\d.*$/i, "").trim();

/** Gramos totales; 0 si algún producto no se vende por peso (no se mezclan gramos con mililitros ni unidades). */
export function pesoCombo(items: Item[]): number {
  return items.every((i) => i.producto.unidad === "g" && i.producto.contenido)
    ? items.reduce((s, i) => s + (i.producto.contenido ?? 0) * i.cantidad, 0)
    : 0;
}

export function seoCombo(c: Combo, minimoEntregaPropia: number): { title: string; description: string } {
  const precio = sinEspacioDuro(pesos(c.precio));
  const peso = medida(pesoCombo(c.items), "g");
  // El nombre a veces ya dice el peso («Despensa de 4 kilos»): no se repite.
  const conPeso = peso && !/kilo|kg/i.test(c.nombre) ? ` (${peso})` : "";
  const cuerpo = `${peso ? `${peso} por ` : ""}${precio}${c.ahorro > 0 ? `, ahorrás ${sinEspacioDuro(pesos(c.ahorro))}` : ""}.`;
  // Sin cargo solo en Villa Carlos Paz (regla del 16/11); el resto de la zona paga según la localidad.
  const entrega = false ? "" : "Entrega en Carlos Paz y la zona. Envíos al país.";
  const fijo = ` ${cuerpo} ${entrega}`;
  // Entran los productos que quepan: el precio y la entrega nunca se cortan.
  const nombres: string[] = [];
  for (const i of c.items) {
    const n = nombreCorto(i.producto.producto);
    // +7: el « y más.» que se agrega si no entran todos.
    if ([...nombres, n].join(", ").length + fijo.length + 7 > MAX_DESCRIPCION) break;
    nombres.push(n);
  }
  const lista = nombres.length ? `${nombres.join(", ")}${nombres.length < c.items.length ? " y más" : ""}.` : "";
  return { title: `Combo ${c.nombre}${conPeso}: ${precio}`, description: `${lista}${fijo}`.trim() };
}

export function altCombo(c: Pick<Combo, "nombre" | "items">): string {
  return `Combo ${c.nombre}: ${c.items.map((i) => nombreCorto(i.producto.producto)).join(", ")}`;
}
