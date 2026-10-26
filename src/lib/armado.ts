// Pizarra de armado de Gonza: qué pedidos hay que preparar, qué lleva cada uno y cuánto de cada producto
// en total. La ven Santiago en la TV mientras arma y la oficina 3D en la pizarra de Logística.
import { pesos } from "./precios";
import { direccionCompleta, linkMapa } from "./mapa";

export type ItemArmado = { producto: string; presentacion: string; cantidad: number; combo: string | null };
export type PedidoArmado = {
  id: number;
  codigo: string;
  cliente: string;
  zona: string;
  cobrar: string;
  pagado: boolean;
  notas: string | null;
  items: ItemArmado[];
  estado: string;
  hace: string;
  /** Link a Google Maps con la navegación hasta el cliente (null si no hay calle). */
  mapa: string | null;
  direccion: string;
  telefono: string;
  total: number;
};
export type TotalArmado = { producto: string; texto: string };
export type Pizarra = { paraArmar: PedidoArmado[]; listos: PedidoArmado[]; enCamino: PedidoArmado[]; esperandoPago: PedidoArmado[]; totales: TotalArmado[]; actualizado: string };

const n = (d: unknown) => Math.round(Number(d) || 0);

/** «Lorenzo Albert» → «Lorenzo A.» (en la TV no va el apellido completo). */
export function nombreCorto(nombre: string): string {
  const p = nombre.replace(/[()[\]{}"'.,]/g, " ").trim().split(/\s+/).filter(Boolean);
  const ape = p.slice(1).find((x) => /^\p{L}/u.test(x));
  return ape ? `${p[0]} ${ape[0].toUpperCase()}.` : p[0] ?? "";
}

/** «x 1 kg» → 1000, «x500gr Fraccionada» → 500, «x 250 g» → 250. Sin peso → null. */
export function gramosDe(presentacion: string): number | null {
  const t = presentacion.toLowerCase().replace(",", ".");
  const fr = t.match(/(\d+)\s*\/\s*(\d+)\s*(kg|kilo|kilos)\b/); // «1/2 kilo», «1/4 kg»
  if (fr && Number(fr[2]) > 0) return Math.round((Number(fr[1]) / Number(fr[2])) * 1000);
  const m = t.match(/(\d+(?:\.\d+)?)\s*(kg|kilo|kilos|grs|gr|g)\b/);
  if (!m) return null;
  const v = Number(m[1]);
  return m[2].startsWith("k") ? v * 1000 : v;
}

export function kilos(g: number): string {
  return g >= 1000 ? `${(g / 1000).toLocaleString("es-AR", { maximumFractionDigits: 2 })} kg` : `${g} g`;
}

/** Lo que hay que juntar en total para todos los pedidos a armar, por producto. */
export function totalesDeArmado(pedidos: PedidoArmado[]): TotalArmado[] {
  const por = new Map<string, { g: number; sinPeso: number; detalle: Map<string, number> }>();
  for (const p of pedidos)
    for (const i of p.items) {
      const t = por.get(i.producto) ?? { g: 0, sinPeso: 0, detalle: new Map() };
      const g = gramosDe(i.presentacion);
      if (g !== null) t.g += g * i.cantidad;
      else t.sinPeso += i.cantidad;
      t.detalle.set(i.presentacion, (t.detalle.get(i.presentacion) ?? 0) + i.cantidad);
      por.set(i.producto, t);
    }
  return [...por.entries()]
    .sort((a, b) => b[1].g - a[1].g || a[0].localeCompare(b[0]))
    .map(([producto, t]) => ({
      producto,
      texto: [t.g ? kilos(t.g) : "", t.sinPeso ? `${t.sinPeso} u.` : ""].filter(Boolean).join(" + ") + `  (${[...t.detalle.entries()].map(([pr, c]) => `${c} × ${pr.replace(/^x\s*/i, "")}`).join(", ")})`,
    }));
}

function cobrarDe(o: { pagadoAt: Date | null; medioPago: string; total: unknown; notas: string | null }): string {
  const nota = o.notas?.match(/cobrar\s*\$?\s*([\d.]+)/i);
  if (nota) return `Cobrar $ ${nota[1]}`;
  if (o.pagadoAt) return "Ya pagó";
  if (o.medioPago === "AL_RECIBIR") return `Cobrar ${pesos(n(o.total))} al entregar`;
  return `Falta el pago (${pesos(n(o.total))})`;
}

function haceCuanto(d: Date): string {
  const h = Math.floor((Date.now() - d.getTime()) / 3_600_000);
  if (h < 1) return "recién";
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export async function pizarraArmado(): Promise<Pizarra> {
  const { prisma } = await import("./prisma");
  const os = await prisma.order.findMany({
    where: { estado: { in: ["PENDIENTE_PAGO", "PAGADO", "EN_COMPRA", "PREPARADO", "ENVIADO"] } },
    include: { items: true, eventos: { select: { estado: true, nota: true } } },
    orderBy: { id: "asc" },
    take: 80,
  });
  const vista = (o: (typeof os)[number]): PedidoArmado => ({
    id: o.id,
    codigo: `AS-${String(o.id).padStart(5, "0")}`,
    cliente: nombreCorto(o.nombre),
    zona: n(o.envioCobrado) > 0 ? `${o.ciudad} · envío ${pesos(n(o.envioCobrado))}` : `${o.ciudad} · sin cargo`,
    cobrar: cobrarDe(o),
    pagado: !!o.pagadoAt,
    notas: o.notas?.replace(/cobrar\s*\$?\s*[\d.]+/i, "").trim() || null,
    items: o.items.map((i) => ({ producto: i.producto, presentacion: i.presentacion, cantidad: i.cantidad, combo: i.comboSlug })),
    estado: o.estado,
    hace: haceCuanto(o.createdAt),
    mapa: linkMapa(o.calle, o.ciudad, o.provincia),
    telefono: o.telefono,
    total: n(o.total),
    direccion: linkMapa(o.calle, o.ciudad, o.provincia) ? direccionCompleta(o.calle, o.ciudad, o.provincia) : "",
  });
  const todos = os.map(vista);
  // Ya se armó si pasó por «Preparado» o se tildó «Listo» en la pizarra. Gonza a veces pasa el pedido a
  // «Enviado» temprano para avisarle al cliente que sale hoy: si todavía no se armó, sigue en «para armar».
  const armado = (k: number) => os[k].eventos.some((e) => e.estado === "PREPARADO" || /armado/i.test(e.nota ?? ""));
  // Se arma lo pagado o lo que se paga al recibir. Lo que espera una transferencia va aparte (y viejo de más de 7 días, no va).
  const reciente = (o: (typeof os)[number]) => Date.now() - o.createdAt.getTime() < 7 * 86_400_000;
  const paraArmar = todos.filter(
    (p, k) => ["PAGADO", "EN_COMPRA"].includes(p.estado) || (p.estado === "PENDIENTE_PAGO" && os[k].medioPago === "AL_RECIBIR" && reciente(os[k])) || (p.estado === "ENVIADO" && !armado(k)),
  );
  const esperandoPago = todos.filter((p, k) => p.estado === "PENDIENTE_PAGO" && os[k].medioPago !== "AL_RECIBIR" && reciente(os[k]));
  return {
    paraArmar,
    listos: todos.filter((p) => p.estado === "PREPARADO"),
    enCamino: todos.filter((p, k) => p.estado === "ENVIADO" && armado(k)),
    esperandoPago,
    totales: totalesDeArmado(paraArmar),
    actualizado: new Date().toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Cordoba", hour: "2-digit", minute: "2-digit" }),
  };
}

/** Las líneas para la pizarra de la oficina 3D de Gonza. */
export function lineasPizarra(p: Pizarra): string {
  if (!p.paraArmar.length && !p.listos.length) return "Sin pedidos para armar. Todo al día.";
  const arm = p.paraArmar.slice(0, 4).map((x) => `${x.codigo.slice(-3)} ${x.cliente} (${x.items.reduce((s, i) => s + i.cantidad, 0)}) · ${x.cobrar}`);
  return [`Para armar: ${p.paraArmar.length} · Listos: ${p.listos.length} · En camino: ${p.enCamino.length}.`, ...arm].join(" — ");
}
