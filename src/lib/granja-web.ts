// Disponibilidad real en la web de La Granja del Centro.
//
// 19/11 (Santiago): «¿cómo puede ser que haya garbanzos y después voy a la lista de la granja y no hay? No podemos
// poner cosas que no estén en la granja. Que todo esté coordinado con la granja, que no falle nada.» La lista PDF
// del día trae también productos que en la web figuran «No disponible» (maíz frito, pimentón ahumado selección,
// quinoa 25 kg…), y la lectura diaria los volvía a la venta. Esto recorre la web (productos.php por categoría,
// 40 por página), arma código → disponible y pasa a SIN_STOCK lo nuestro que La Granja no tiene; cuando vuelve a
// estar, lo reactiva (solo lo que pausó esto: lo pausado a mano en casa no se toca).
import { COMBOS_PROVEEDORES, PRODUCTOS_PROVEEDORES } from "./catalogo-proveedores";
import { PRODUCTOS_ENCARGO } from "./catalogo-encargo";

export const MOTIVO_GRANJA_WEB = "La Granja: no disponible en su web";
const BASE = "https://lagranjadelcentro.com.ar/";

export type CajaGranja = { codigo: string; nombre: string; precio: number; disponible: boolean };

/** Lee las cajas de producto de una página de productos.php. Puro: se prueba con HTML guardado. */
export function leerCajas(html: string): CajaGranja[] {
  const partes = html.split('class="box-content-1"').slice(1);
  return partes.map((p) => {
    const codigo = (p.match(/class="p-cod-content-1">\s*([^<\s]+)\s*</) ?? [])[1] ?? "";
    const nombre = (p.match(/data-product-name="([^"]*)"/) ?? p.match(/class="h3-content-1">([^<]*)</) ?? [])[1] ?? "";
    const precio = Number((p.match(/itemprop="price" content="([\d.]+)"/) ?? [])[1] ?? 0);
    const corte = p.indexOf('class="box-content-1"');
    const caja = corte > 0 ? p.slice(0, corte) : p;
    const disponible = precio > 0 && !/No disponible/i.test(caja.slice(0, 4000));
    return { codigo: codigo.trim(), nombre: nombre.trim(), precio, disponible };
  });
}

/** «9-977-021» → «977-021»; las variantes con sufijo (promo ×10: «9-977-021-10») no cuentan. */
export function claveGranja(codigoWeb: string): string | null {
  const m = codigoWeb.trim().match(/^\d-(\d{3}-\d{3})$/);
  return m ? m[1] : null;
}

async function pagina(qs: string): Promise<string> {
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${BASE}productos.php?${qs}`, { signal: AbortSignal.timeout(25_000) }).then((x) => x.text()).catch(() => "");
    if (r) return r;
  }
  return "";
}

/** Recorre toda la web: categoría por categoría, página por página. */
export async function leerWebGranja(): Promise<{ cajas: CajaGranja[]; paginas: number; categorias: number[] }> {
  const home = await pagina("");
  const cats = [...new Set([...home.matchAll(/id_cat=(\d+)/g)].map((m) => Number(m[1])))].filter((n) => n > 0 && n < 100);
  const categorias = cats.length ? cats : Array.from({ length: 12 }, (_, i) => i + 1);
  let paginas = 0;
  const porCategoria = await Promise.all(
    categorias.map(async (cat) => {
      const todas: CajaGranja[] = [];
      for (let n = 1; n <= 40; n++) {
        const html = await pagina(n === 1 ? `id_cat=${cat}` : `pagina=${n}&id_cat=${cat}`);
        const cajas = leerCajas(html);
        paginas++;
        if (!cajas.length) break;
        const nuevas = cajas.filter((c) => !todas.some((t) => t.codigo === c.codigo));
        if (!nuevas.length) break; // la web repite la última página
        todas.push(...nuevas);
        if (!html.includes(`pagina=${n + 1}&`)) break;
      }
      return todas;
    }),
  );
  return { cajas: porCategoria.flat(), paginas, categorias };
}

export type ResultadoGranjaWeb = {
  leidosWeb: number;
  paginas: number;
  nuestros: number;
  pausar: { codigo: string; producto: string }[];
  reactivar: { codigo: string; producto: string }[];
  noEstanEnLaWeb: { codigo: string; producto: string }[];
  aplicado: boolean;
  aviso?: string;
  /** 23/11: lo que hoy hay que comprar en otra presentación y sale más caro que el costo cargado. */
  costoSubio?: CostoSubio[];
};

export type CostoSubio = { codigo: string; producto: string; costoCargado: number; costoHoy: number; compra: string; combos: string[] };

/**
 * 23/11 (Santiago): «quedamos sin dátiles de Egipto… por esos dátiles existía el combo, ahora los pagamos más caros
 * y no lo tuvimos en cuenta. Cada día ver qué se queda sin stock». Cuando la caja habitual no está y se compra otra
 * presentación, compara el costo por kilo de la más barata disponible con el costo cargado. Puro.
 */
export function costosQueSubieron(cajas: CajaGranja[], tolerancia = 0.05): CostoSubio[] {
  const porClave = new Map<string, CajaGranja>();
  for (const c of cajas) { const k = claveGranja(c.codigo); if (k && c.disponible && c.precio > 0) porClave.set(k, c); }
  const kilos = (nombre: string) => { const m = nombre.match(/X\s*(\d+(?:[.,]\d+)?)\s*KG/i); return m ? Number(m[1].replace(",", ".")) : null; };
  const salida: CostoSubio[] = [];
  for (const [codigo, alts] of Object.entries(ALTERNATIVAS)) {
    const p = PRODUCTOS_PROVEEDORES.find((x) => x.codigo === codigo);
    if (!p || !p.codigoProveedor || p.unidad !== "g" || !p.contenido) continue;
    if (porClave.has(p.codigoProveedor.replace(/^\d-(?=\d{3}-\d{3}$)/, ""))) continue; // la caja habitual está: el costo lo actualiza la lista del día
    const opciones = alts.map((a) => porClave.get(a)).filter((c): c is CajaGranja => Boolean(c)).map((c) => ({ c, kg: kilos(c.nombre) })).filter((o) => o.kg);
    if (!opciones.length) continue;
    const mejor = opciones.reduce((a, b) => (a.c.precio / a.kg! <= b.c.precio / b.kg! ? a : b));
    const costoHoy = Math.round((mejor.c.precio / mejor.kg!) * (p.contenido / 1000));
    if (costoHoy <= p.costo * (1 + tolerancia)) continue;
    salida.push({
      codigo, producto: `${p.producto} ${p.presentacion}`.trim(), costoCargado: p.costo, costoHoy, compra: mejor.c.nombre,
      combos: COMBOS_PROVEEDORES.filter((c) => c.items.some((i) => i.codigo === codigo)).map((c) => c.nombre.split(" · ")[0]),
    });
  }
  return salida;
}

/** Texto del aviso diario (null si nada subió). */
export function avisoCostos(lista: CostoSubio[]): string | null {
  if (!lista.length) return null;
  const $ = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
  return ["⚠️ Insumo de combos más caro hoy (la caja habitual no está en La Granja):",
    ...lista.map((x) => `· ${x.producto}: costo cargado ${$(x.costoCargado)}, hoy ${$(x.costoHoy)} (+${Math.round((x.costoHoy / x.costoCargado - 1) * 100)}%) comprando «${x.compra}». Lo usan: ${x.combos.join(", ") || "ningún combo"}.`),
    "Los precios de venta NO cambiaron solos: decidí si se ajusta el suelto o el combo."].join("\n");
}

/** Otras presentaciones del proveedor que sirven igual para lo que fraccionamos nosotros. */
export const ALTERNATIVAS: Record<string, string[]> = {
  "LG-DATIL": ["980-027", "980-047", "980-018"], // Egipto x 1 kg, Deglet Nour x 5 kg y x 1 kg
  "LG-DATIL-500": ["980-027", "980-047", "980-018"],
  // 25/11 (Santiago: «cosas desactualizadas como las nueces que nos pueden hacer perder plata»): la caja de nuez de
  // 10 kg dejó de estar y el costo quedó viejo. Lo que fraccionamos con un código que puede faltar, con su reemplazo.
  "TG-NUEZ": ["981-028"],
  "LG-NUEZ-10KG": ["981-028"],
  "TG-ALMGUARA": ["981-024"],
  "LG-PASAS-10KG": ["009-034", "916-602"],
  "LG-CAJU-5KG": ["981-013", "981-003"],
};

/** Cruza la web con nuestro catálogo de La Granja. Con aplicar, pausa y reactiva. */
export async function cruzarConWebGranja(aplicar: boolean): Promise<ResultadoGranjaWeb> {
  const { prisma } = await import("./prisma");
  const { cajas, paginas } = await leerWebGranja();
  const disp = new Map<string, boolean>();
  for (const c of cajas) {
    const k = claveGranja(c.codigo);
    if (!k) continue;
    disp.set(k, (disp.get(k) ?? false) || c.disponible);
  }
  const nuestro = new Map<string, string>();
  for (const p of [...PRODUCTOS_PROVEEDORES, ...PRODUCTOS_ENCARGO]) if (p.codigoProveedor && p.codigo.startsWith("LG-")) nuestro.set(p.codigo, p.codigoProveedor);
  const productos = await prisma.product.findMany({
    where: { codigo: { in: [...nuestro.keys()] }, visible: true },
    select: { codigo: true, producto: true, presentacion: true, estado: true, ocultoMotivo: true },
  });
  const pausar: ResultadoGranjaWeb["pausar"] = [];
  const reactivar: ResultadoGranjaWeb["reactivar"] = [];
  const noEstanEnLaWeb: ResultadoGranjaWeb["noEstanEnLaWeb"] = [];
  for (const p of productos) {
    const k = nuestro.get(p.codigo)!.replace(/^\d-(?=\d{3}-\d{3}$)/, "");
    // 23/11: la caja de dátiles Egipto x 5 kg (980-028) figuró «no disponible» y el robot pausó los dátiles:
    // el Trío (casi todas las ventas) y la Despensa dieron 404 toda la mañana con los anuncios prendidos.
    // Lo que fraccionamos se puede comprar en otra presentación: alcanza con que haya una.
    const d = disp.get(k) === false && (ALTERNATIVAS[p.codigo] ?? []).some((alt) => disp.get(alt)) ? true : disp.get(k);
    const nombre = `${p.producto} ${p.presentacion}`.trim();
    if (d === undefined) {
      noEstanEnLaWeb.push({ codigo: p.codigo, producto: nombre });
      continue;
    }
    if (!d && p.estado === "ACTIVO") pausar.push({ codigo: p.codigo, producto: nombre });
    if (d && p.estado === "SIN_STOCK" && p.ocultoMotivo === MOTIVO_GRANJA_WEB) reactivar.push({ codigo: p.codigo, producto: nombre });
  }
  const r: ResultadoGranjaWeb = { leidosWeb: cajas.length, paginas, nuestros: productos.length, pausar, reactivar, noEstanEnLaWeb, aplicado: false, costoSubio: costosQueSubieron(cajas) };
  // Si la web vino rota (pocas cajas) no se toca nada.
  if (cajas.length < 500) {
    r.aviso = `La web de La Granja devolvió solo ${cajas.length} productos: no se cambió nada.`;
    return r;
  }
  if (pausar.length > Math.max(60, productos.length * 0.25)) {
    r.aviso = `Pausaría ${pausar.length} productos de golpe: no se aplicó, revisalo a mano.`;
    return r;
  }
  if (aplicar) {
    if (pausar.length)
      await prisma.product.updateMany({ where: { codigo: { in: pausar.map((x) => x.codigo) }, estado: "ACTIVO" }, data: { estado: "SIN_STOCK", ocultoMotivo: MOTIVO_GRANJA_WEB } });
    if (reactivar.length)
      await prisma.product.updateMany({ where: { codigo: { in: reactivar.map((x) => x.codigo) }, ocultoMotivo: MOTIVO_GRANJA_WEB }, data: { estado: "ACTIVO", ocultoMotivo: null } });
    r.aplicado = true;
  }
  return r;
}
