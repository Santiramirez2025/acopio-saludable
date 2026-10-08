import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { numeroPedido } from "@/lib/pedidos";
import { SITIO } from "@/lib/sitio";

export default async function Etiqueta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [pedido, cfg] = await Promise.all([/^\d+$/.test(id) ? prisma.order.findUnique({ where: { id: Number(id) } }) : null, leerConfig()]);
  if (!pedido) notFound();
  const bultos = Array.from({ length: Math.max(1, pedido.bultos) }, (_, i) => i + 1);
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Link href={`/admin/pedidos/${pedido.id}`} className="text-sm text-stone-600 underline">← Pedido {numeroPedido(pedido.id)}</Link>
        <p className="mt-1 text-sm text-stone-600">Una etiqueta por bulto. Para imprimir: Ctrl/Cmd + P.</p>
      </div>
      {bultos.map((n) => (
        <div key={n} className="mx-auto max-w-md break-inside-avoid rounded-lg border-2 border-stone-900 bg-white p-5 text-stone-900">
          <div className="flex justify-between border-b border-stone-300 pb-2 text-sm">
            <span className="font-semibold">{SITIO.nombre}</span>
            <span>Pedido {numeroPedido(pedido.id)} · Bulto {n} de {bultos.length}</span>
          </div>
          <p className="mt-3 text-xs uppercase tracking-wide text-stone-600">Destinatario</p>
          <p className="text-2xl font-bold leading-tight">{pedido.nombre}</p>
          <p className="mt-1 text-lg">{pedido.calle}</p>
          <p className="text-lg">{pedido.ciudad}, {pedido.provincia}</p>
          <p className="text-3xl font-bold tabular-nums">CP {pedido.cp}</p>
          <p className="mt-1">Tel. {pedido.telefono}</p>
          {pedido.notas && <p className="mt-1 text-sm">Obs.: {pedido.notas}</p>}
          <div className="mt-3 border-t border-stone-300 pt-2 text-sm">
            <p>{pedido.envioNombre}{pedido.tracking ? ` · ${pedido.tracking}` : ""}</p>
            <p className="text-stone-600">Remitente: {SITIO.nombre}, {SITIO.base} (CP {cfg.cpOrigen}){cfg.whatsapp ? ` · ${cfg.whatsapp}` : ""}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
