import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { pesos } from "@/lib/precios";
import { listaDeCompra, nombreEstado, numeroPedido } from "@/lib/pedidos";

export default async function ListaCompra({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pedido = /^\d+$/.test(id) ? await prisma.order.findUnique({ where: { id: Number(id) }, include: { items: true } }) : null;
  if (!pedido) notFound();
  const { renglones, total } = listaDeCompra(pedido.items);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/admin/pedidos/${pedido.id}`} className="text-sm text-stone-500 underline">← Pedido {numeroPedido(pedido.id)}</Link>
        <a href={`/api/admin/pedidos/${pedido.id}/compra`} className="btn-sec">Descargar CSV</a>
      </div>
      <h1 className="text-xl font-semibold">Lista de compra a Distrimay · Pedido {numeroPedido(pedido.id)}</h1>
      <p className="text-sm text-stone-500">{pedido.nombre} · {nombreEstado(pedido.estado)}. Costos al momento de la compra del cliente. Para imprimir: Ctrl/Cmd + P.</p>
      {pedido.estado === "PENDIENTE_PAGO" && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 print:hidden">Este pedido todavía no está pago: no compres hasta confirmarlo.</p>}
      <table className="w-full rounded-lg border border-stone-200 bg-white text-sm">
        <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
          <tr><th className="px-3 py-2">Código</th><th className="px-3 py-2">Producto</th><th className="px-3 py-2 text-right">Cantidad</th><th className="px-3 py-2 text-right">Costo</th><th className="px-3 py-2 text-right">Total</th></tr>
        </thead>
        <tbody>
          {renglones.map((r) => (
            <tr key={r.codigo} className="border-t border-stone-100">
              <td className="px-3 py-2 font-mono text-xs">{r.codigo}</td>
              <td className="px-3 py-2">{r.producto} <span className="text-stone-500">{r.presentacion}</span></td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{r.cantidad}</td>
              <td className="px-3 py-2 text-right tabular-nums">{pesos(r.costo)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{pesos(r.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr className="border-t border-stone-300 font-semibold"><td colSpan={4} className="px-3 py-2 text-right">Total a pagar a Distrimay</td><td className="px-3 py-2 text-right tabular-nums">{pesos(total)}</td></tr></tfoot>
      </table>
    </div>
  );
}
