import type { Prisma } from "@prisma/client";

export const VISTAS = [
  { id: "todos", nombre: "Todos" },
  { id: "publicados", nombre: "Publicados" },
  { id: "sin-margen", nombre: "Sin margen" },
  { id: "ocultos", nombre: "Ocultos" },
  { id: "sin-foto", nombre: "Sin foto" },
  { id: "sin-peso", nombre: "Sin peso" },
  { id: "sin-revisar", nombre: "Clasificación sin revisar" },
  { id: "ganchos", nombre: "Ganchos" },
  { id: "borrador", nombre: "Borrador" },
  { id: "sin-stock", nombre: "Sin stock" },
] as const;

/** Publicado = visible + activo + margen igual o mayor al mínimo. */
export function wherePublicado(margenMinimoPct: number): Prisma.ProductWhereInput {
  return { visible: true, estado: "ACTIVO", margenPct: { gte: margenMinimoPct } };
}

export function whereVista(vista: string, margenMinimoPct: number): Prisma.ProductWhereInput {
  switch (vista) {
    case "publicados":
      return wherePublicado(margenMinimoPct);
    case "sin-margen":
      return { margenPct: { lt: margenMinimoPct } };
    case "ocultos":
      return { visible: false };
    case "sin-foto":
      return { fotoUrl: null };
    case "sin-peso":
      return { pesoBrutoG: null };
    case "sin-revisar":
      return { clasificacionRevisada: false };
    case "ganchos":
      return { gancho: true };
    case "borrador":
      return { estado: "BORRADOR" };
    case "sin-stock":
      return { estado: "SIN_STOCK" };
    default:
      return {};
  }
}

// --- Sin TACC ---
// Se toma del rótulo que informa el proveedor en el nombre o la presentación ("Sin Gluten", "Sin TACC", "S/TACC"...).
// No es una certificación propia: en la tienda siempre se muestra con el aviso de verificar el envase.
// Solo cuenta si el producto llega envasado por un fabricante con marca: un producto sin marca o fraccionado
// (por nosotros o por el mayorista) no está en el Listado Integrado de ANMAT aunque el ingrediente no tenga
// gluten, y puede tener contaminación cruzada. A esos no se les muestra el rótulo.
const ROTULOS_SIN_TACC = ["sin gluten", "sin tacc", "sin  tacc", "sin t.a.c.c", "s/tacc", "s/ tacc", "libre de gluten"];
const PATRON_SIN_TACC = /sin\s*gluten|sin\s*t\.?a\.?c\.?c|s\/\s*tacc|libre de gluten/i;
const PATRON_SIN_TACC_G = /\s*(sin\s*gluten|sin\s*t\.?a\.?c\.?c\.?|s\/\s*tacc|libre de gluten)\s*/gi;
const MARCA_NO_VALIDA = /sin marca|fraccionad|granel/i;

export const AVISO_SIN_TACC = "Productos envasados con marca y rotulados sin TACC o sin gluten por su fabricante. Verificá siempre el logo oficial en el envase. Lo que fraccionamos no se marca sin TACC.";

type ConRotulo = { producto: string; presentacion: string; marca?: string | null };

/** Tiene la leyenda en el nombre o la presentación (sea o no válida). */
export function tieneRotuloSinTacc(p: ConRotulo): boolean {
  return PATRON_SIN_TACC.test(`${p.producto} ${p.presentacion}`);
}

/** Rótulo válido: leyenda del fabricante, con marca, y no fraccionado. */
export function esSinTacc(p: ConRotulo): boolean {
  const marca = (p.marca ?? "").trim();
  return tieneRotuloSinTacc(p) && Boolean(marca) && !MARCA_NO_VALIDA.test(marca) && !/fraccionad/i.test(`${p.producto} ${p.presentacion}`);
}

/** Saca la leyenda «sin TACC / sin gluten» de un texto. */
export function sinRotuloTacc(t: string): string {
  return t.replace(PATRON_SIN_TACC_G, " ").replace(/\s+/g, " ").trim();
}

/** Nombre y presentación para mostrar: si el rótulo no es válido, se saca del texto. */
export function textosSeguros<T extends ConRotulo>(p: T): { producto: string; presentacion: string } {
  if (!tieneRotuloSinTacc(p) || esSinTacc(p)) return { producto: p.producto, presentacion: p.presentacion };
  return { producto: sinRotuloTacc(p.producto), presentacion: sinRotuloTacc(p.presentacion) };
}

export const WHERE_SIN_TACC: Prisma.ProductWhereInput = {
  AND: [
    {
      OR: ROTULOS_SIN_TACC.flatMap((r) => [
        { producto: { contains: r, mode: "insensitive" as const } },
        { presentacion: { contains: r, mode: "insensitive" as const } },
      ]),
    },
    { marca: { not: "" } },
    { NOT: { marca: { contains: "sin marca", mode: "insensitive" as const } } },
    { NOT: { marca: { contains: "fraccionad", mode: "insensitive" as const } } },
    { NOT: { marca: { contains: "granel", mode: "insensitive" as const } } },
    { NOT: { producto: { contains: "fraccionad", mode: "insensitive" as const } } },
    { NOT: { presentacion: { contains: "fraccionad", mode: "insensitive" as const } } },
  ],
};
