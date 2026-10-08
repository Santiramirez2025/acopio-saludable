// Capa de lectura de la tienda pública. Nada de lo que sale de acá incluye el costo.

import type { Combo, ComboItem, Prisma, Product } from "@prisma/client";
import { prisma } from "./prisma";
import { leerConfig } from "./config";
import { calcularCombo, redondear2 } from "./precios";
import { wherePublicado } from "./filtros-producto";

export type ProductoTienda = {
  codigo: string;
  producto: string;
  marca: string;
  presentacion: string;
  categoria: string;
  formato: string;
  precio: number;
  contenido: number | null;
  unidad: string | null;
  fotoUrl: string | null;
  gancho: boolean;
  esSuplemento: boolean;
};

export function aTienda(p: Product): ProductoTienda {
  return {
    codigo: p.codigo,
    producto: p.producto,
    marca: p.marca,
    presentacion: p.presentacion,
    categoria: p.categoria,
    formato: p.formato,
    precio: Number(p.precioPublico),
    contenido: p.contenido,
    unidad: p.unidad,
    fotoUrl: p.fotoUrl,
    gancho: p.gancho,
    esSuplemento: p.categoria === "Suplementos",
  };
}

export function estaPublicado(p: Product, margenMinimoPct: number): boolean {
  return p.visible && p.estado === "ACTIVO" && Number(p.margenPct) >= margenMinimoPct;
}

type ComboConItems = Combo & { items: (ComboItem & { product: Product })[] };

export type ComboTienda = {
  slug: string;
  nombre: string;
  tipo: "COMBO" | "PEDIDO_NICHO";
  nicho: string | null;
  destacado: boolean;
  descuentoPct: number;
  precioLista: number;
  precio: number;
  ahorro: number;
  disponible: boolean;
  items: { producto: ProductoTienda; cantidad: number }[];
};

export function comboVigente(c: Combo, ahora = new Date()): boolean {
  return c.activo && (!c.vigenteDesde || c.vigenteDesde <= ahora) && (!c.vigenteHasta || c.vigenteHasta >= ahora);
}

/** Un combo se vende solo si está vigente, todos sus productos están publicados y respeta el margen mínimo. */
export function aComboTienda(c: ComboConItems, margenMinimoPct: number): ComboTienda {
  const lineas = c.items.map((i) => ({ precio: Number(i.product.precioPublico), costo: Number(i.product.costo), cantidad: i.cantidad }));
  const calc = calcularCombo(lineas, Number(c.descuentoPct), margenMinimoPct);
  return {
    slug: c.slug,
    nombre: c.nombre,
    tipo: c.tipo,
    nicho: c.nicho,
    destacado: c.destacado,
    descuentoPct: Number(c.descuentoPct),
    precioLista: calc.precioLista,
    precio: calc.precioCombo,
    ahorro: redondear2(calc.precioLista - calc.precioCombo),
    disponible:
      c.items.length > 0 && comboVigente(c) && !calc.bloqueado && c.items.every((i) => estaPublicado(i.product, margenMinimoPct)),
    items: c.items.map((i) => ({ producto: aTienda(i.product), cantidad: i.cantidad })),
  };
}

export async function combosTienda(where: Prisma.ComboWhereInput = {}): Promise<ComboTienda[]> {
  const cfg = await leerConfig();
  const combos = await prisma.combo.findMany({
    where,
    include: { items: { include: { product: true }, orderBy: { codigo: "asc" } } },
    orderBy: [{ destacado: "desc" }, { id: "asc" }],
  });
  return combos.map((c) => aComboTienda(c, cfg.margenMinimoPct));
}

export async function productosTienda(args: {
  where?: Prisma.ProductWhereInput;
  orderBy?: Prisma.ProductOrderByWithRelationInput[];
  take?: number;
  skip?: number;
}): Promise<ProductoTienda[]> {
  const cfg = await leerConfig();
  const filas = await prisma.product.findMany({
    where: { AND: [wherePublicado(cfg.margenMinimoPct), args.where ?? {}] },
    // Por defecto: ganchos y más vendidos primero, y los que no tienen foto al final.
    orderBy: args.orderBy ?? [{ gancho: "desc" }, { fotoUrl: { sort: "asc", nulls: "last" } }, { vendidos: "desc" }, { producto: "asc" }, { codigo: "asc" }],
    take: args.take,
    skip: args.skip,
  });
  return filas.map(aTienda);
}

// ---------- Carrito ----------

import { sanearLineas } from "./tienda-saneo";
export { sanearLineas, MAX_CANTIDAD, MAX_LINEAS, type LineaEntrada } from "./tienda-saneo";
import type { LineaEntrada } from "./tienda-saneo";

export type LineaCotizada = {
  tipo: "producto" | "combo";
  id: string;
  cantidad: number;
  nombre: string;
  detalle: string;
  fotoUrl: string | null;
  href: string;
  precioUnitario: number;
  precioLista: number;
  subtotal: number;
  disponible: boolean;
};

export type Cotizacion = {
  lineas: LineaCotizada[];
  subtotal: number;
  unidades: number;
  compraMinima: number;
  falta: number;
  progresoPct: number;
  puedePagar: boolean;
};

/** El precio siempre se calcula en el servidor: el navegador solo manda qué y cuánto. */
export async function cotizarCarrito(entrada: unknown): Promise<Cotizacion> {
  const lineasEntrada = sanearLineas(entrada);
  const cfg = await leerConfig();
  const codigos = lineasEntrada.filter((l) => l.tipo === "producto").map((l) => l.id);
  const slugs = lineasEntrada.filter((l) => l.tipo === "combo").map((l) => l.id);
  const [productos, combos] = await Promise.all([
    codigos.length ? prisma.product.findMany({ where: { codigo: { in: codigos } } }) : [],
    slugs.length ? combosTienda({ slug: { in: slugs }, tipo: "COMBO" }) : [],
  ]);
  const porCodigo = new Map(productos.map((p) => [p.codigo, p]));
  const porSlug = new Map(combos.map((c) => [c.slug, c]));

  const lineas: LineaCotizada[] = [];
  for (const l of lineasEntrada) {
    if (l.tipo === "producto") {
      const p = porCodigo.get(l.id);
      if (!p) continue;
      const disponible = estaPublicado(p, cfg.margenMinimoPct);
      const precio = Number(p.precioPublico);
      lineas.push({
        ...l,
        nombre: p.producto,
        detalle: `${p.marca} · ${p.presentacion}`,
        fotoUrl: p.fotoUrl,
        href: `/producto/${encodeURIComponent(p.codigo)}`,
        precioUnitario: precio,
        precioLista: precio,
        subtotal: disponible ? redondear2(precio * l.cantidad) : 0,
        disponible,
      });
    } else {
      const c = porSlug.get(l.id);
      if (!c) continue;
      lineas.push({
        ...l,
        nombre: c.nombre,
        detalle: `Combo · ${c.items.reduce((s, i) => s + i.cantidad, 0)} productos`,
        fotoUrl: c.items[0]?.producto.fotoUrl ?? null,
        href: `/combos/${c.slug}`,
        precioUnitario: c.precio,
        precioLista: c.precioLista,
        subtotal: c.disponible ? redondear2(c.precio * l.cantidad) : 0,
        disponible: c.disponible,
      });
    }
  }
  const subtotal = redondear2(lineas.reduce((s, l) => s + l.subtotal, 0));
  const falta = Math.max(0, redondear2(cfg.compraMinima - subtotal));
  return {
    lineas,
    subtotal,
    unidades: lineas.filter((l) => l.disponible).reduce((s, l) => s + l.cantidad, 0),
    compraMinima: cfg.compraMinima,
    falta,
    progresoPct: cfg.compraMinima > 0 ? Math.min(100, Math.round((subtotal / cfg.compraMinima) * 100)) : 100,
    puedePagar: subtotal > 0 && falta === 0,
  };
}
