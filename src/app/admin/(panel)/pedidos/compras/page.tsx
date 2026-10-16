// Compras y reparto: todo lo que hay que comprar en Distrimay para los pedidos abiertos,
// sumado por producto, y la lista de entregas con dirección, horario y cómo paga cada uno.
// Para salir a comprar y a repartir con una sola hoja (se imprime con Ctrl/Cmd + P).

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pesos } from "@/lib/precios";
import { A_CONFIRMAR, listaDeCompra, NOMBRE_MEDIO, nombreEstado, numeroPedido } from "@/lib/pedidos";
import { claveCompras, codigoCargarDistrimay } from "@/lib/compra-distrimay";
import { urlSitio } from "@/lib/sitio";
import { MarcadorCompras } from "@/components/MarcadorCompras";

export const dynamic = "force-dynamic";

export default async function ComprasYReparto() {
  // Abiertos: pagados, o por transferencia / al recibir aunque todavía no estén pagos (ya son compras).
  const pedidos = await prisma.order.findMany({
    where: {
      OR: [{ estado: "PAGADO" }, { estado: "EN_COMPRA" }, { estado: "PREPARADO" }, { estado: "PENDIENTE_PAGO", medioPago: { in: ["TRANSFERENCIA", "AL_RECIBIR"] } }],
    },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });
  const aComprar = pedidos.filter((p) => p.estado === "PAGADO" || p.estado === "PENDIENTE_PAGO");
  const { renglones, total } = listaDeCompra(aComprar.flatMap((p) => p.items));
  const reparto = pedidos.filter((p) => p.envioOrigen === "propia");
  const correo = pedidos.filter((p) => p.envioOrigen !== "propia");
  const sinPagar = aComprar.filter((p) => p.estado === "PENDIENTE_PAGO" && p.medioPago === "TRANSFERENCIA");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/admin/pedidos" className="text-sm text-stone-600 underline">← Pedidos</Link>
        <p className="text-sm text-stone-600">Para imprimir: Ctrl/Cmd + P</p>
      </div>
      <h1 className="text-xl font-semibold">Compras y reparto</h1>

      <section className="space-y-2">
        <h2 className="font-semibold">Comprar en Distrimay · {aComprar.length} pedido{aComprar.length === 1 ? "" : "s"}</h2>
        <div className="rounded-lg border border-acopio-200 bg-acopio-50 p-3 text-sm print:hidden">
          <p>
            <b>Cargar todo en el carrito de Distrimay con un toque.</b> Arrastrá este botón a la barra de favoritos una sola vez (o creá un favorito y pegá el código):{" "}
            <MarcadorCompras codigo={codigoCargarDistrimay(urlSitio(), claveCompras())} />
          </p>
          <p className="mt-1 text-stone-700">Después, con compras.distrimay.com abierto (y tu sesión iniciada), tocalo: busca cada código y lo suma al carrito con su cantidad. Vos revisás y tocás «Finalizar compra». Si el carrito tiene otras cosas, vacialo antes.</p>
        </div>
        {sinPagar.length > 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Transferencia todavía sin confirmar: {sinPagar.map((p) => `${numeroPedido(p.id)} (${p.nombre})`).join(", ")}. Revisá que haya llegado antes de comprar.
          </p>
        )}
        {renglones.length ? (
          <table className="w-full rounded-lg border border-stone-200 bg-white text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-600">
              <tr><th className="px-3 py-2">Código</th><th className="px-3 py-2">Producto</th><th className="px-3 py-2 text-right">Cantidad</th><th className="px-3 py-2 text-right">Costo</th><th className="px-3 py-2 text-right">Total</th></tr>
            </thead>
            <tbody>
              {renglones.map((r) => (
                <tr key={r.codigo} className="border-t border-stone-100">
                  <td className="px-3 py-2 font-mono text-xs">{r.codigo}</td>
                  <td className="px-3 py-2">{r.producto} <span className="text-stone-600">{r.presentacion}</span></td>
                  <td className="px-3 py-2 text-right text-base font-semibold tabular-nums">{r.cantidad}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pesos(r.costo)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pesos(r.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t border-stone-300 font-semibold"><td colSpan={4} className="px-3 py-2 text-right">Total a pagar a Distrimay</td><td className="px-3 py-2 text-right tabular-nums">{pesos(total)}</td></tr></tfoot>
          </table>
        ) : (
          <p className="text-sm text-stone-600">No hay nada para comprar ahora.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Reparto propio · {reparto.length} entrega{reparto.length === 1 ? "" : "s"}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {reparto.map((p) => (
            <article key={p.id} className="break-inside-avoid rounded-lg border border-stone-200 bg-white p-3 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <Link href={`/admin/pedidos/${p.id}`} className="font-semibold underline">{numeroPedido(p.id)} · {p.nombre}</Link>
                <span className="text-xs text-stone-600">{nombreEstado(p.estado)}</span>
              </div>
              <p className={p.calle === A_CONFIRMAR ? "font-semibold text-amber-700" : ""}>{p.calle}, {p.ciudad}</p>
              {p.notas && <p className="text-stone-700">{p.notas}</p>}
              <p><a href={`https://wa.me/${p.telefono.replace(/\D/g, "")}`} className="underline">{p.telefono}</a></p>
              <ul className="mt-1 text-stone-700">{p.items.map((i) => <li key={i.id}>{i.cantidad} × {i.producto} {i.presentacion}</li>)}</ul>
              <p className="mt-1 font-semibold">
                {p.medioPago === "AL_RECIBIR" ? `Cobrar al entregar: ${pesos(Number(p.total))}` : p.estado === "PENDIENTE_PAGO" ? `${NOMBRE_MEDIO[p.medioPago]} sin confirmar: ${pesos(Number(p.total))}` : `Pagado (${NOMBRE_MEDIO[p.medioPago]})`}
              </p>
            </article>
          ))}
          {!reparto.length && <p className="text-sm text-stone-600">No hay entregas propias pendientes.</p>}
        </div>
      </section>

      {correo.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Por correo · {correo.length}</h2>
          <ul className="text-sm">{correo.map((p) => <li key={p.id}><Link href={`/admin/pedidos/${p.id}`} className="underline">{numeroPedido(p.id)}</Link> · {p.nombre} · {p.calle}, {p.ciudad} ({p.provincia}) · {p.envioNombre}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
