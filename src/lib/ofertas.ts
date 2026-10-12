// Productos que bajaron de precio en la última actualización del proveedor.
// El cálculo puro (cuánto bajó, el mínimo y la ventana) vive en precios.ts, que no toca la base.

import { prisma } from "./prisma";
import { leerConfig } from "./config";
import { wherePublicado } from "./filtros-producto";
import { aTienda, type ProductoTienda } from "./tienda";
import { BAJA_MINIMA_PCT, DIAS_DE_OFERTA, bajaPct, precioVenta } from "./precios";

export type Oferta = ProductoTienda & { precioAntes: number; bajoPct: number };

type Fila = { codigo: string; actual: string | number; anterior: string | number };

/**
 * Los que bajaron, del que más bajó al que menos.
 *
 * El historial guarda una fila por cada cambio de precio, así que comparamos las dos últimas
 * de cada producto: si la nueva es menor que la anterior, bajó. No sirve mirar el costo,
 * porque lo que el cliente ve es el precio público.
 */
export async function ofertasDelProveedor(limite = 12): Promise<Oferta[]> {
  const desde = new Date(Date.now() - DIAS_DE_OFERTA * 24 * 60 * 60 * 1000);
  const filas = await prisma.$queryRaw<Fila[]>`
    WITH ult AS (
      SELECT codigo, "precioPublico", fecha,
             ROW_NUMBER() OVER (PARTITION BY codigo ORDER BY fecha DESC) AS rn
      FROM "PriceHistory"
      WHERE fecha > ${desde}
    )
    SELECT a.codigo, a."precioPublico" AS actual, b."precioPublico" AS anterior
    FROM ult a
    JOIN ult b ON b.codigo = a.codigo AND b.rn = 2
    WHERE a.rn = 1 AND b."precioPublico" > a."precioPublico"
  `;
  if (!filas.length) return [];

  const cfg = await leerConfig();
  const bajas = new Map<string, number>();
  for (const f of filas) {
    const anterior = Number(f.anterior);
    const actual = Number(f.actual);
    if (bajaPct(anterior, actual) >= BAJA_MINIMA_PCT) bajas.set(f.codigo, anterior);
  }
  if (!bajas.size) return [];

  const productos = await prisma.product.findMany({
    where: { AND: [wherePublicado(cfg.margenMinimoPct), { codigo: { in: [...bajas.keys()] } }, { fotoUrl: { not: null } }] },
  });

  return productos
    .map((p) => {
      const ficha = aTienda(p, cfg);
      // El precio de antes también lleva el recargo: si no, la comparación miente.
      const precioAntes = precioVenta(bajas.get(p.codigo)!, cfg.recargoPrecioPct ?? 0);
      return { ...ficha, precioAntes, bajoPct: bajaPct(precioAntes, ficha.precio) };
    })
    .filter((o) => o.bajoPct >= BAJA_MINIMA_PCT)
    .sort((a, b) => b.bajoPct - a.bajoPct)
    .slice(0, limite);
}
