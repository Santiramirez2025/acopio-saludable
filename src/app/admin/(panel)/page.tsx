import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { VISTAS, whereVista } from "@/lib/filtros-producto";
import { pesos } from "@/lib/precios";

export default async function Resumen() {
  const cfg = await leerConfig();
  const conteos = await Promise.all(VISTAS.map((v) => prisma.product.count({ where: whereVista(v.id, cfg.margenMinimoPct) })));
  const categorias = await prisma.product.groupBy({ by: ["categoria"], _count: true, orderBy: { _count: { categoria: "desc" } } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Resumen del catálogo</h1>
        <p className="text-sm text-stone-600">
          Compra mínima {pesos(cfg.compraMinima)} · margen mínimo {cfg.margenMinimoPct}%
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {VISTAS.map((v, i) => (
          <Link key={v.id} href={`/admin/productos?vista=${v.id}`} className="tarjeta hover:border-acopio-500">
            <div className="text-2xl font-semibold tabular-nums">{conteos[i]}</div>
            <div className="text-xs text-stone-600">{v.nombre}</div>
          </Link>
        ))}
      </div>
      <div className="tarjeta">
        <h2 className="mb-3 text-sm font-semibold">Por categoría</h2>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {categorias.map((c) => (
            <li key={c.categoria} className="flex justify-between border-b border-stone-100 py-1">
              <Link href={`/admin/productos?categoria=${encodeURIComponent(c.categoria)}`} className="hover:underline">{c.categoria}</Link>
              <span className="tabular-nums text-stone-600">{c._count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
