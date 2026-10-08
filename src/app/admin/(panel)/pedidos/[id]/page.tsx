import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { pesos } from "@/lib/precios";
import { ESTADOS, linkWhatsapp, margenNeto, nombreEstado, numeroPedido } from "@/lib/pedidos";
import { cambiarEstadoPedido } from "@/lib/acciones";

export default async function PedidoAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const pedido = /^\d+$/.test(id) ? await prisma.order.findUnique({ where: { id: Number(id) }, include: { items: { orderBy: { id: "asc" } }, eventos: { orderBy: { fecha: "desc" } } } }) : null;
  if (!pedido) notFound();
  const numero = numeroPedido(pedido.id);
  const m = margenNeto(pedido);
  const sinPeso = await prisma.product.count({ where: { codigo: { in: pedido.items.map((i) => i.codigo) }, pesoBrutoG: null } });
  const wa = linkWhatsapp(pedido.telefono, `Hola ${pedido.nombre}, te escribimos de Acopio Saludable por tu pedido ${numero}.`);
  const fila = (etiqueta: string, valor: string, clase = "") => (
    <div className={`flex justify-between gap-3 ${clase}`}><dt className="text-stone-600">{etiqueta}</dt><dd className="tabular-nums">{valor}</dd></div>
  );

  return (
    <div className="space-y-4">
      <Link href="/admin/pedidos" className="text-sm text-stone-600 underline">← Pedidos</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Pedido {numero} <span className="chip bg-acopio-100 text-acopio-700">{nombreEstado(pedido.estado)}</span></h1>
          <p className="text-sm text-stone-600">{pedido.createdAt.toLocaleString("es-AR", { timeZone: "America/Argentina/Cordoba" })} · {pedido.medioPago === "MERCADOPAGO" ? `Mercado Pago${pedido.mpPaymentId ? ` (pago ${pedido.mpPaymentId})` : ""}` : "Transferencia"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/pedidos/${pedido.id}/compra`} className="btn">Lista de compra a Distrimay</Link>
          <Link href={`/admin/pedidos/${pedido.id}/etiqueta`} className="btn-sec">Etiqueta de envío</Link>
          <Link href={`/pedido/${pedido.token}`} className="btn-sec">Ver como cliente</Link>
        </div>
      </div>
      {ok && <p className="rounded-md bg-acopio-100 px-3 py-2 text-sm text-acopio-700">Pedido actualizado.</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">No se guardó: {error}</p>}
      {sinPeso > 0 && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{sinPeso} producto(s) de este pedido no tienen peso cargado: el envío se calculó con 500 g por unidad.</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="tarjeta">
            <h2 className="mb-2 text-sm font-semibold">Productos</h2>
            <table className="w-full text-sm">
              <tbody>
                {pedido.items.map((i) => (
                  <tr key={i.id} className="border-b border-stone-100">
                    <td className="py-1.5 pr-2 font-mono text-xs text-stone-600">{i.codigo}</td>
                    <td className="py-1.5">{i.cantidad} × {i.producto} <span className="text-stone-500">{i.presentacion}</span>{i.comboSlug && <span className="chip ml-1 bg-stone-100 text-stone-600">{i.comboSlug}</span>}</td>
                    <td className="py-1.5 text-right tabular-nums">{pesos(Number(i.precioUnitario) * i.cantidad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tarjeta text-sm">
            <h2 className="mb-2 text-sm font-semibold">Cliente y entrega</h2>
            <p className="font-medium">{pedido.nombre}</p>
            <p>{pedido.email} · {pedido.telefono} {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="text-acopio-700 underline">WhatsApp</a>}</p>
            <p className="mt-1">{pedido.calle}, {pedido.ciudad}, {pedido.provincia} ({pedido.cp})</p>
            <p className="text-stone-600">{pedido.envioNombre} · {pedido.bultos} {pedido.bultos === 1 ? "bulto" : "bultos"} · {(pedido.pesoTotalG / 1000).toFixed(1)} kg · cotizado por {pedido.envioOrigen}{pedido.tracking ? ` · seguimiento ${pedido.tracking}` : ""}</p>
            {pedido.notas && <p className="mt-1 rounded bg-stone-100 px-2 py-1">Nota del cliente: {pedido.notas}</p>}
          </div>
          <div className="tarjeta">
            <h2 className="mb-2 text-sm font-semibold">Historial</h2>
            <ul className="text-sm">
              {pedido.eventos.map((e) => (
                <li key={e.id} className="flex justify-between gap-3 border-b border-stone-100 py-1">
                  <span>{nombreEstado(e.estado)}{e.nota ? ` · ${e.nota}` : ""}</span>
                  <span className="whitespace-nowrap text-stone-600">{e.fecha.toLocaleString("es-AR", { timeZone: "America/Argentina/Cordoba", dateStyle: "short", timeStyle: "short" })}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <form action={cambiarEstadoPedido} className="tarjeta space-y-3 text-sm">
            <input type="hidden" name="id" value={pedido.id} />
            <div>
              <label className="etiqueta" htmlFor="estado">Estado</label>
              <select className="campo" id="estado" name="estado" defaultValue={pedido.estado}>
                {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div><label className="etiqueta" htmlFor="tracking">Código de seguimiento</label><input className="campo" id="tracking" name="tracking" defaultValue={pedido.tracking ?? ""} /></div>
            <div><label className="etiqueta" htmlFor="nota">Nota (opcional)</label><input className="campo" id="nota" name="nota" maxLength={300} /></div>
            <button className="btn w-full">Actualizar</button>
            {pedido.estado === "PENDIENTE_PAGO" && <p className="text-xs text-stone-600">Al pasar a Pagado se confirma el pedido y se le avisa al cliente por email.</p>}
          </form>
          <dl className="tarjeta space-y-1 text-sm">
            <h2 className="mb-1 text-sm font-semibold">Números del pedido</h2>
            {fila("Subtotal", pesos(Number(pedido.subtotal)))}
            {Number(pedido.descuento) > 0 && fila("Descuento", `− ${pesos(Number(pedido.descuento))}`)}
            {fila("Envío cobrado", pesos(Number(pedido.envioCobrado)))}
            {fila("Total cobrado", pesos(Number(pedido.total)), "font-semibold")}
            <hr className="my-2 border-stone-200" />
            {fila("Costo de productos", `− ${pesos(Number(pedido.costoProductos))}`)}
            {fila("Margen bruto", `${pesos(m.bruto)} (${m.brutoPct.toFixed(1)}%)`)}
            {fila("Envío real", pesos(Number(pedido.costoEnvioReal)))}
            {fila("Subsidio de envío", `− ${pesos(m.subsidioEnvio)}`)}
            {fila("Comisión de pago", `− ${pesos(Number(pedido.comisionPago))}`)}
            {fila("Packaging", `− ${pesos(Number(pedido.costoPackaging))}`)}
            {fila("Margen neto", `${pesos(m.neto)} (${m.netoPct.toFixed(1)}%)`, `font-semibold ${m.neto < 0 ? "text-red-600" : "text-acopio-700"}`)}
          </dl>
        </div>
      </div>
    </div>
  );
}
