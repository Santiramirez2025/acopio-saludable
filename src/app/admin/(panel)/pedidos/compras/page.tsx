// Compras y reparto: todo lo que hay que comprar para los pedidos abiertos, sumado por producto
// y partido por proveedor (Todo Granolas, La Granja del Centro, Distrimay), y la lista de entregas con dirección, horario y cómo paga cada uno.
// Para salir a comprar y a repartir con una sola hoja (se imprime con Ctrl/Cmd + P).

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pesos } from "@/lib/precios";
import { A_CONFIRMAR, compraPorProveedor, NOMBRE_MEDIO, nombreEstado, numeroPedido, pedidosPorComprar } from "@/lib/pedidos";
import { yaComprado } from "@/lib/acciones";
import { claveCompras, codigoCargarDistrimay } from "@/lib/compra-distrimay";
import { urlSitio } from "@/lib/sitio";
import { MarcadorCompras } from "@/components/MarcadorCompras";

export const dynamic = "force-dynamic";

export default async function ComprasYReparto({ searchParams }: { searchParams: Promise<{ comprado?: string }> }) {
  const { comprado } = await searchParams;
  // Abiertos: pagados, o por transferencia / al recibir aunque todavía no estén pagos (ya son compras).
  const pedidos = await prisma.order.findMany({
    where: {
      OR: [{ estado: "PAGADO" }, { estado: "EN_COMPRA" }, { estado: "PREPARADO" }, { estado: "PENDIENTE_PAGO", medioPago: { in: ["TRANSFERENCIA", "AL_RECIBIR"] } }],
    },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });
  const aComprar = await pedidosPorComprar();
  const grupos = await compraPorProveedor(aComprar.flatMap((p) => p.items));
  const hayCompra = grupos.length > 0;
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
        <h2 className="font-semibold">Comprar · {aComprar.length} pedido{aComprar.length === 1 ? "" : "s"}</h2>
        {sinPagar.length > 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Transferencia todavía sin confirmar: {sinPagar.map((p) => `${numeroPedido(p.id)} (${p.nombre})`).join(", ")}. Revisá que haya llegado antes de comprar.
          </p>
        )}
        {comprado && <p className="rounded-md bg-acopio-50 px-3 py-2 text-sm text-acopio-800">Listo: esos pedidos ya no se vuelven a sumar a la compra.</p>}
        {grupos.map(({ proveedor, renglones, total }) => (
          <div key={proveedor.id} className="space-y-2 break-inside-avoid">
            <h3 className="font-semibold">{proveedor.nombre} <span className="text-sm font-normal text-stone-600">· {proveedor.que}</span></h3>
            <p className="text-sm text-stone-700">
              {proveedor.como} ·{" "}
              <a href={`https://wa.me/${proveedor.contacto}`} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a>
            </p>
            {proveedor.id === "distrimay" && (
              <div className="rounded-lg border border-acopio-200 bg-acopio-50 p-3 text-sm print:hidden">
                <p>
                  <b>Cargar esto en el carrito de Distrimay con un toque.</b> Arrastrá este botón a la barra de favoritos una sola vez (o creá un favorito y pegá el código):{" "}
                  <MarcadorCompras codigo={codigoCargarDistrimay(urlSitio(), claveCompras())} />
                </p>
                <p className="mt-1 text-stone-700">Con compras.distrimay.com abierto (y tu sesión iniciada), tocalo: suma al carrito solo lo de Distrimay. Vos revisás y tocás «Finalizar compra».</p>
              </div>
            )}
            <table className="w-full rounded-lg border border-stone-200 bg-white text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-600">
                <tr><th className="px-3 py-2">Código</th><th className="px-3 py-2">Producto</th><th className="px-3 py-2 text-right">Cantidad</th><th className="px-3 py-2 text-right">Costo ref.</th><th className="px-3 py-2 text-right">Total</th></tr>
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
              <tfoot><tr className="border-t border-stone-300 font-semibold"><td colSpan={4} className="px-3 py-2 text-right">Total de referencia</td><td className="px-3 py-2 text-right tabular-nums">{pesos(total)}</td></tr></tfoot>
            </table>
          </div>
        ))}
        {hayCompra && <p className="text-xs text-stone-600">El costo de referencia es el de Distrimay hasta que carguemos las listas de Todo Granolas y La Granja: lo real es más bajo.</p>}
        {hayCompra ? (
          <form action={yaComprado} className="flex flex-wrap items-center gap-3 print:hidden">
            <input type="hidden" name="ids" value={aComprar.map((p) => p.id).join(",")} />
            <button className="btn">✓ Ya lo compré</button>
            <span className="text-sm text-stone-600">Marca {aComprar.map((p) => numeroPedido(p.id)).join(", ")} como comprados: salen de esta lista y el próximo pedido arranca de cero.</span>
          </form>
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
