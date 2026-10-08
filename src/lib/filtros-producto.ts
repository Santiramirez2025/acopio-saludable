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
const ROTULOS_SIN_TACC = ["sin gluten", "sin tacc", "sin  tacc", "sin t.a.c.c", "s/tacc", "s/ tacc", "libre de gluten"];
const PATRON_SIN_TACC = /sin\s*gluten|sin\s*t\.?a\.?c\.?c|s\/\s*tacc|libre de gluten/i;

export const AVISO_SIN_TACC = "Productos rotulados sin TACC o sin gluten por su fabricante. Verificá siempre el logo oficial en el envase.";

export function esSinTacc(p: { producto: string; presentacion: string }): boolean {
  return PATRON_SIN_TACC.test(`${p.producto} ${p.presentacion}`);
}

export const WHERE_SIN_TACC: Prisma.ProductWhereInput = {
  OR: ROTULOS_SIN_TACC.flatMap((r) => [
    { producto: { contains: r, mode: "insensitive" as const } },
    { presentacion: { contains: r, mode: "insensitive" as const } },
  ]),
};
