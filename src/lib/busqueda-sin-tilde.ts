// «datiles» tiene que encontrar «Dátiles»: la búsqueda del catálogo y del panel compara sin tildes.
// Se resuelve en Postgres con translate(), sin depender de la extensión unaccent.

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const CON = "áéíóúüñÁÉÍÓÚÜÑ";
const SIN = "aeiouunAEIOUUN";

export const sinTilde = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Los códigos de los productos cuyo nombre, marca o presentación contienen `q`, ignorando tildes y mayúsculas. */
export async function codigosQueCoinciden(q: string): Promise<string[]> {
  const patron = `%${sinTilde(q.trim()).replace(/[%_]/g, "")}%`;
  const filas = await prisma.$queryRaw<{ codigo: string }[]>`
    SELECT "codigo" FROM "Product"
    WHERE translate(lower("producto" || ' ' || "marca" || ' ' || "presentacion"), ${CON}, ${SIN}) LIKE ${patron}
       OR "codigo" = ${q.trim()}`;
  return filas.map((f) => f.codigo);
}

/** Condición de Prisma para el texto buscado: por código, sin tildes. */
export async function whereBusqueda(q: string): Promise<Prisma.ProductWhereInput> {
  return { codigo: { in: await codigosQueCoinciden(q) } };
}
