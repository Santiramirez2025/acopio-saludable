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
