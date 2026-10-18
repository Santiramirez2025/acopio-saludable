import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { pesos } from "@/lib/precios";
import { numeroPedido } from "@/lib/pedidos";
import { NOMBRE_MEDIO } from "@/lib/pedido-calculos";
import { CompartirComprobante } from "@/components/CompartirComprobante";

export const metadata: Metadata = { title: "Comprobante de pago", robots: { index: false, follow: false } };

const PAGADOS = ["PAGADO", "EN_COMPRA", "PREPARADO", "ENVIADO", "ENTREGADO"];
const FECHA = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Cordoba", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Comprobante de pago online: el cliente lo abre desde el link, lo guarda o lo comparte.
 * No es una factura fiscal; solo constancia de que el pedido está pago.
 */
export default async function Comprobante({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pedido = await prisma.order.findUnique({ where: { token }, include: { items: true } });
  if (!pedido) notFound();
  const numero = numeroPedido(pedido.id);
  const pago = PAGADOS.includes(pedido.estado) && pedido.pagadoAt;

  if (!pago) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-tierra-200 bg-white p-6 text-center">
        <p className="font-display text-xl font-bold text-acopio-900">Todavía no registramos el pago</p>
        <p className="mt-2 text-sm text-stone-600">El comprobante del pedido {numero} aparece acá apenas confirmamos el pago.</p>
        <Link href={`/pedido/${token}`} className="btn mt-4">Ver mi pedido</Link>
      </div>
    );
  }

  const subtotal = Number(pedido.subtotal);
  const descuento = Number(pedido.descuento);
  const envio = Number(pedido.envioCobrado);
  return (
    <div className="mx-auto max-w-md space-y-4">
      <article className="relative overflow-hidden rounded-2xl border border-tierra-200 bg-white shadow-sm" aria-label={`Comprobante de pago del pedido ${numero}`}>
        <header className="bg-acopio-900 px-5 py-4 text-white">
          <p className="font-display text-lg font-bold">Acopio Saludable</p>
          <p className="text-xs text-white/75">Santiago Agustín Ramírez · CUIT 20-37092832-1 · Monotributo · Villa Carlos Paz, Córdoba</p>
        </header>
        <div className="space-y-4 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Comprobante de pago</p>
              <p className="font-display text-2xl font-bold text-acopio-900 tabular-nums">{numero}</p>
              <p className="text-sm text-stone-600">{FECHA.format(pedido.pagadoAt!)}</p>
            </div>
            <span className="-rotate-6 rounded-lg border-2 border-emerald-600 px-3 py-1 font-display text-lg font-extrabold tracking-wider text-emerald-700">PAGADO</span>
          </div>
          <div className="rounded-xl bg-acopio-50 px-4 py-3 text-sm">
            <p><span className="text-stone-500">Cliente:</span> <b>{pedido.nombre}</b></p>
            <p><span className="text-stone-500">Medio de pago:</span> {NOMBRE_MEDIO[pedido.medioPago]}{pedido.mpPaymentId ? ` · operación ${pedido.mpPaymentId}` : ""}</p>
            <p><span className="text-stone-500">Entrega:</span> {pedido.envioNombre}</p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {pedido.items.map((i) => (
                <tr key={i.id} className="border-b border-stone-100 align-top">
                  <td className="py-2 pr-2">{i.cantidad} × {i.producto} <span className="text-stone-500">{i.presentacion}</span></td>
                  <td className="py-2 text-right tabular-nums">{pesos(Number(i.precioUnitario) * i.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="space-y-1 text-sm tabular-nums">
            <div className="flex justify-between"><dt>Productos</dt><dd>{pesos(subtotal)}</dd></div>
            {descuento > 0 && <div className="flex justify-between text-acopio-700"><dt>Descuentos</dt><dd>− {pesos(descuento)}</dd></div>}
            <div className="flex justify-between"><dt>Envío</dt><dd>{envio > 0 ? pesos(envio) : "Sin cargo"}</dd></div>
            <div className="flex justify-between border-t border-stone-200 pt-2 text-lg font-bold"><dt>Total pagado</dt><dd>{pesos(Number(pedido.total))}</dd></div>
          </dl>
          <p className="text-[11px] text-stone-500">Constancia de pago. Documento no válido como factura. Si necesitás factura, pedila respondiendo por WhatsApp.</p>
        </div>
      </article>
      <CompartirComprobante numero={numero} />
      <Link href={`/pedido/${token}`} className="block text-center text-sm text-stone-600 underline">Ver el estado de mi pedido</Link>
    </div>
  );
}
