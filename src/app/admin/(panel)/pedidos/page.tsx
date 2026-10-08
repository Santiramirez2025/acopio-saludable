import Link from "next/link";
import type { EstadoPedido } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pesos } from "@/lib/precios";
import { ESTADOS, margenNeto, nombreEstado, numeroPedido } from "@/lib/pedidos";

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const filtro = ESTADOS.some((e) => e.id === estado) ? (estado as EstadoPedido) : undefined;
  const [pedidos, conteos] = await Promise.all([
    prisma.order.findMany({ where: filtro ? { estado: filtro } : {}, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.order.groupBy({ by: ["estado"], _count: true }),
  ]);
  const cuenta = (e: EstadoPedido) => conteos.find((c) => c.estado === e)?._count ?? 0;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pedidos</h1>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/admin/pedidos" className={`chip ${!filtro ? "bg-acopio-600 text-white" : "bg-stone-200 text-stone-700"}`}>Todos</Link>
        {ESTADOS.map((e) => (
          <Link key={e.id} href={`/admin/pedidos?estado=${e.id}`} className={`chip ${filtro === e.id ? "bg-acopio-600 text-white" : "bg-stone-200 text-stone-700"}`}>
            {e.nombre} ({cuenta(e.id)})
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">Pedido</th><th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Pago</th>
              <th className="px-3 py-2">Envío</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Margen neto</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => {
              const m = margenNeto(p);
              return (
                <tr key={p.id} className="border-t border-stone-100">
                  <td className="px-3 py-2"><Link href={`/admin/pedidos/${p.id}`} className="font-medium text-acopio-700 underline">{numeroPedido(p.id)}</Link><div className="text-xs text-stone-500">{p.createdAt.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Cordoba" })}</div></td>
                  <td className="px-3 py-2">{p.nombre}<div className="text-xs text-stone-500">{p.ciudad}, {p.provincia}</div></td>
                  <td className="px-3 py-2"><span className={`chip ${p.estado === "PENDIENTE_PAGO" ? "bg-amber-100 text-amber-800" : p.estado === "CANCELADO" ? "bg-stone-200 text-stone-600" : "bg-acopio-100 text-acopio-700"}`}>{nombreEstado(p.estado)}</span></td>
                  <td className="px-3 py-2">{p.medioPago === "MERCADOPAGO" ? "Mercado Pago" : "Transferencia"}</td>
                  <td className="px-3 py-2">{p.envioNombre}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pesos(Number(p.total))}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${m.neto < 0 ? "font-semibold text-red-600" : ""}`}>{pesos(m.neto)} <span className="text-xs text-stone-500">({m.netoPct.toFixed(1)}%)</span></td>
                </tr>
              );
            })}
            {!pedidos.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-stone-500">No hay pedidos{filtro ? " en ese estado" : " todavía"}.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
