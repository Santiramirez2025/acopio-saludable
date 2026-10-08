import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { pesos } from "@/lib/precios";
import { linkWhatsapp, nombreEstado, numeroPedido, procesarPagoMp } from "@/lib/pedidos";
import { mpConfigurado, obtenerPago } from "@/lib/mercadopago";
import { Titulo } from "@/components/Tienda";
import { VaciarCarrito } from "@/components/VaciarCarrito";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ payment_id?: string; mp?: string; nuevo?: string }> };

export default async function PedidoPagina({ params, searchParams }: Props) {
  const { token } = await params;
  const sp = await searchParams;
  let pedido = await prisma.order.findUnique({ where: { token }, include: { items: true } });
  if (!pedido) notFound();

  // Al volver de Mercado Pago el aviso puede no haber llegado todavía: consultamos el pago directamente.
  if (pedido.estado === "PENDIENTE_PAGO" && pedido.medioPago === "MERCADOPAGO" && sp.payment_id && /^\d+$/.test(sp.payment_id) && mpConfigurado()) {
    try {
      const pago = await obtenerPago(sp.payment_id);
      if (pago.external_reference === token && (await procesarPagoMp(pago)) === "confirmado") {
        pedido = await prisma.order.findUniqueOrThrow({ where: { token }, include: { items: true } });
      }
    } catch (e) {
      console.error(e);
    }
  }
  const cfg = await leerConfig();
  const numero = numeroPedido(pedido.id);
  const pendiente = pedido.estado === "PENDIENTE_PAGO";
  const wa = cfg.whatsapp ? linkWhatsapp(cfg.whatsapp, `Hola, hice el pedido ${numero} en Acopio Saludable por ${pesos(Number(pedido.total))}.${pedido.medioPago === "TRANSFERENCIA" && pendiente ? " Te envío el comprobante de la transferencia." : ""}`) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {sp.nuevo && <VaciarCarrito />}
      <Titulo sobre={`Pedido ${numero}`}>{pendiente ? "Recibimos tu pedido" : pedido.estado === "CANCELADO" ? "Pedido cancelado" : "¡Gracias por tu compra!"}</Titulo>
      <p className="-mt-3 text-stone-600">
        Estado: <span className="font-semibold text-acopio-700">{nombreEstado(pedido.estado)}</span>
        {pedido.tracking ? ` · Seguimiento: ${pedido.tracking}` : ""}
      </p>

      {pendiente && pedido.medioPago === "TRANSFERENCIA" && (
        <section className="rounded-xl border border-tierra-200 bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Pagá por transferencia</h2>
          <p className="mt-1 text-stone-700">
            Transferí <span className="font-semibold tabular-nums">{pesos(Number(pedido.total))}</span> y mandanos el comprobante. Cuando lo vemos, confirmamos tu pedido.
          </p>
          {cfg.transferenciaDatos ? (
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-tierra-100 p-3 font-sans text-sm">{cfg.transferenciaDatos}</pre>
          ) : (
            <p className="mt-3 text-sm text-stone-600">Te pasamos los datos de la cuenta por WhatsApp o email.</p>
          )}
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn mt-4">Enviar comprobante por WhatsApp</a>}
        </section>
      )}
      {pendiente && pedido.medioPago === "MERCADOPAGO" && (
        <section className="rounded-xl border border-tierra-200 bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Falta el pago</h2>
          {sp.mp === "error" && <p className="mt-1 text-sm text-red-700">No pudimos conectar con Mercado Pago. Probá de nuevo en unos minutos.</p>}
          {sp.mp === "no-disponible" && <p className="mt-1 text-sm text-red-700">Mercado Pago no está disponible en este momento. Escribinos y lo resolvemos.</p>}
          <p className="mt-1 text-stone-700">Tu pedido queda guardado. Si ya pagaste, la confirmación puede tardar unos minutos.</p>
          <a href={`/pedido/${token}/pagar`} className="btn mt-4">Pagar {pesos(Number(pedido.total))} con Mercado Pago</a>
        </section>
      )}
      {!pendiente && pedido.estado !== "CANCELADO" && wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-sec">Escribinos por WhatsApp</a>
      )}

      <section className="rounded-xl border border-tierra-200 bg-white">
        <ul className="divide-y divide-tierra-100">
          {pedido.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 p-3 text-sm">
              <span>{i.cantidad} × {i.producto} <span className="text-stone-600">{i.presentacion}</span></span>
              <span className="tabular-nums">{pesos(Number(i.precioUnitario) * i.cantidad)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-tierra-200 p-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{pesos(Number(pedido.subtotal))}</dd></div>
          {Number(pedido.descuento) > 0 && <div className="flex justify-between text-acopio-700"><dt>Descuento por transferencia</dt><dd className="tabular-nums">− {pesos(Number(pedido.descuento))}</dd></div>}
          <div className="flex justify-between"><dt>{pedido.envioNombre}</dt><dd className="tabular-nums">{Number(pedido.envioCobrado) > 0 ? pesos(Number(pedido.envioCobrado)) : "Sin cargo"}</dd></div>
          <div className="flex justify-between pt-1 text-lg font-semibold"><dt>Total</dt><dd className="tabular-nums">{pesos(Number(pedido.total))}</dd></div>
        </dl>
      </section>
      <section className="rounded-xl border border-tierra-200 bg-white p-4 text-sm text-stone-700">
        <p className="font-medium text-stone-900">Entrega</p>
        <p>{pedido.nombre} · {pedido.calle}, {pedido.ciudad}, {pedido.provincia} ({pedido.cp})</p>
        {pedido.envioPlazo && <p className="text-stone-600">{pedido.envioPlazo}</p>}
      </section>
      <Link href="/catalogo" className="text-sm text-acopio-700 underline">Seguir mirando el catálogo</Link>
    </div>
  );
}
