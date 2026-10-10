import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { wherePublicado } from "@/lib/filtros-producto";
import { aTienda } from "@/lib/tienda";
import { GrillaProductos, Titulo, TituloSeccion } from "@/components/Tienda";

export const metadata: Metadata = { title: "Novedades y bajas de precio", description: "Productos que entraron al catálogo y los que bajaron de precio en las últimas semanas. Se actualiza solo con cada cambio de lista.", alternates: { canonical: "/novedades" } };
export const dynamic = "force-dynamic";

export default async function Novedades() {
  const cfg = await leerConfig();
  const publicado = wherePublicado(cfg.margenMinimoPct);
  const hace = (dias: number) => new Date(Date.now() - dias * 86400000);
  // Bajas: productos cuyo último precio registrado es menor que el anterior.
  const bajas = await prisma.$queryRaw<{ codigo: string }[]>`
    SELECT codigo FROM (
      SELECT codigo, "precioPublico" AS actual, fecha,
        LAG("precioPublico") OVER (PARTITION BY codigo ORDER BY fecha, id) AS anterior,
        ROW_NUMBER() OVER (PARTITION BY codigo ORDER BY fecha DESC, id DESC) AS rn
      FROM "PriceHistory") t
    WHERE rn = 1 AND anterior IS NOT NULL AND actual < anterior AND fecha > ${hace(30)}
    ORDER BY (anterior - actual) / anterior DESC LIMIT 12`;
  const [nuevos, rebajados] = await Promise.all([
    prisma.product.findMany({ where: { AND: [publicado, { createdAt: { gt: hace(30) } }] }, orderBy: [{ createdAt: "desc" }, { codigo: "asc" }], take: 12 }),
    bajas.length ? prisma.product.findMany({ where: { AND: [publicado, { codigo: { in: bajas.map((b) => b.codigo) } }] } }) : Promise.resolve([]),
  ]);
  const hoy = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Cordoba" });
  return (
    <div className="space-y-10">
      <Titulo sobre={`Actualizado el ${hoy}`} bajada="Lo que entró al catálogo y lo que bajó de precio en los últimos 30 días. Esta página se arma sola cada vez que cambia la lista.">Novedades y bajas de precio</Titulo>
      <section>
        <TituloSeccion>Bajaron de precio</TituloSeccion>
        {rebajados.length ? <GrillaProductos productos={rebajados.map((f) => aTienda(f, cfg))} /> : <p className="rounded-2xl bg-white p-6 text-sm text-stone-600 shadow-ficha">En los últimos 30 días no hubo bajas de precio. Mirá los <Link href="/combos" className="underline">combos con descuento</Link>.</p>}
      </section>
      <section>
        <TituloSeccion>Recién llegados</TituloSeccion>
        {nuevos.length ? <GrillaProductos productos={nuevos.map((f) => aTienda(f, cfg))} /> : <p className="rounded-2xl bg-white p-6 text-sm text-stone-600 shadow-ficha">No entraron productos nuevos en los últimos 30 días. Mirá <Link href="/catalogo" className="underline">todo el catálogo</Link>.</p>}
      </section>
    </div>
  );
}
