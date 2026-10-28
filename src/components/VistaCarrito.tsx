"use client";

import Link from "next/link";
import { BarraMinimo, pesosCliente, useCarrito } from "./Carrito";
import { medir } from "@/lib/medicion";
import { linkWhatsapp } from "@/lib/pedido-calculos";
import { Foto } from "./Foto";
import { CuentaRegresiva } from "./CuentaRegresiva";

/** whatsapp: número de la tienda (de la configuración). Si está, el carrito ofrece cerrar el pedido por WhatsApp. */
export function VistaCarrito({ whatsapp }: { whatsapp?: string | null }) {
  const { lineas, listo, cotizacion, cotizando, fijar, vaciar } = useCarrito();
  if (!listo || (lineas.length > 0 && !cotizacion)) return <p className="text-stone-600">Cargando tu carrito…</p>;
  if (!lineas.length || !cotizacion?.lineas.length) {
    return (
      <div className="rounded-xl border border-tierra-200 bg-white p-8 text-center">
        <p className="font-medium">Tu carrito está vacío.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/armador" className="btn">Armá tu pedido en 3 pasos</Link>
          <Link href="/catalogo" className="btn-sec">Ver catálogo</Link>
        </div>
      </div>
    );
  }
  const { puedePagar, falta, subtotal, conTransferencia, gananciaReventa, corte } = cotizacion;
  // En Carlos Paz y la zona la compra mínima es más baja: con eso ya se puede seguir; el checkout
  // controla el mínimo de la zona elegida (y el servidor también).
  const puedeSeguir = puedePagar || cotizacion.puedePagarEnZona;
  const faltaZona = Math.max(0, cotizacion.compraMinimaPropia - subtotal);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-4 rounded-xl border border-tierra-200 bg-white p-4">
          <BarraMinimo />
        </div>
        <ul className="divide-y divide-tierra-100 rounded-xl border border-tierra-200 bg-white">
          {cotizacion.lineas.map((l) => (
            <li key={`${l.tipo}:${l.id}`} className="p-3">
              <div className="flex items-center gap-3">
              <Foto src={l.fotoUrl} alt="" etiqueta=" " className="h-16 w-16 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <Link href={l.href} className="line-clamp-2 text-sm leading-snug font-medium hover:underline">{l.nombre}</Link>
                {l.contenido.length === 0 && <p className="truncate text-xs text-stone-600">{l.detalle}</p>}

                {l.disponible ? (
                  <p className="text-xs tabular-nums text-stone-600">{pesosCliente(l.precioUnitario)} c/u</p>
                ) : (
                  <p className="text-xs font-medium text-red-600">Ya no está disponible. No se suma al total.</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center rounded-md border border-stone-300">
                  <button type="button" className="paso" aria-label={`Restar ${l.nombre}`} onClick={() => fijar(l.tipo, l.id, l.cantidad - 1)}>−</button>
                  <input className="w-11 h-12 border-0 bg-transparent p-0 text-center text-sm font-semibold tabular-nums" inputMode="numeric" aria-label={`Cantidad de ${l.nombre}`} value={l.cantidad} onChange={(e) => fijar(l.tipo, l.id, Number.parseInt(e.target.value, 10) || 1)} />
                  <button type="button" className="paso" aria-label={`Sumar ${l.nombre}`} onClick={() => fijar(l.tipo, l.id, l.cantidad + 1)}>+</button>
                </div>
                <span className="text-sm font-medium tabular-nums">{pesosCliente(l.subtotal)}</span>
                <button type="button" className="text-xs text-stone-600 underline" onClick={() => fijar(l.tipo, l.id, 0)}>Quitar</button>
                </div>
              </div>
              {l.contenido.length > 0 && (
                <p className="mt-2 rounded-lg bg-acopio-50 px-3 py-2 text-xs leading-snug text-stone-700">
                  <b className="font-semibold text-acopio-900">Trae:</b> {l.contenido.join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
        <button type="button" className="mt-3 text-sm text-stone-600 underline" onClick={vaciar}>Vaciar carrito</button>
      </div>

      <aside className="h-fit space-y-3 rounded-xl border border-tierra-200 bg-white p-5 lg:sticky lg:top-28">
        <div className="flex items-baseline justify-between">
          <span className="text-stone-600">Subtotal</span>
          <span className={`text-2xl font-semibold tabular-nums ${cotizando ? "opacity-50" : ""}`}>{pesosCliente(subtotal)}</span>
        </div>
        {conTransferencia !== null && (
          <div className="rounded-xl border border-acopio-600/30 bg-acopio-100/60 px-3.5 py-2.5 text-sm">
            <p className="font-semibold text-acopio-700">Pagando por transferencia ahorrás {pesosCliente(subtotal - conTransferencia)}</p>
            <p className="mt-0.5 text-stone-700">Te queda en <b className="tabular-nums">{pesosCliente(conTransferencia)}</b>. Elegís cómo pagar en el paso siguiente: transferencia, o tarjeta por Mercado Pago al precio de lista.</p>
          </div>
        )}
        {gananciaReventa > 0 && (
          <div className="rounded-xl bg-acopio-100 px-3.5 py-2.5 text-sm">
            <p className="text-stone-700">Si lo revendés al precio sugerido</p>
            <p className="font-display text-xl font-bold tabular-nums text-acopio-700">ganás {pesosCliente(gananciaReventa)}</p>
          </div>
        )}
        <CuentaRegresiva corte={corte} />
        {puedeSeguir && !cotizando ? (
          <Link href="/checkout" className="btn-comprar w-full">Continuar con la compra</Link>
        ) : (
          <button type="button" className="btn-comprar w-full" disabled aria-describedby="motivo-bloqueo">Continuar con la compra</button>
        )}
        {whatsapp && (
          <a
            href={pedidoPorWhatsapp(whatsapp, cotizacion.lineas.filter((l) => l.disponible), subtotal)}
            target="_blank"
            rel="noopener"
            className="btn-sec w-full"
            onClick={() => medir("iniciar_compra", { valor: subtotal })}
          >
            Pedir por WhatsApp sin llenar datos
          </a>
        )}
        <p className="text-xs text-stone-600">Al confirmar el pedido quedan fijos los precios de hoy. El envío se calcula en el paso siguiente.</p>
        {!puedeSeguir && (
          <p id="motivo-bloqueo" className="text-sm text-tierra-700">
            Te faltan {pesosCliente(faltaZona || falta)} para llegar a la compra mínima. <Link href="/catalogo" className="underline">Seguir sumando</Link>
          </p>
        )}
        {puedeSeguir && !puedePagar && (
          <p className="text-sm text-stone-700">
            En Carlos Paz y la zona ya podés pedir. Para envíos a otras localidades la compra mínima es {pesosCliente(cotizacion.compraMinima)} (te faltan {pesosCliente(falta)}).
          </p>
        )}
      </aside>
    </div>
  );
}

/** El carrito armado como mensaje: el vendedor lo recibe y cierra el pedido (dirección y pago) en la charla. */
function pedidoPorWhatsapp(numero: string, lineas: { nombre: string; cantidad: number; subtotal: number }[], subtotal: number): string {
  const detalle = lineas.map((l) => `• ${l.cantidad} × ${l.nombre}: ${pesosCliente(l.subtotal)}`).join("\n");
  const texto = `Hola! Quiero hacer este pedido de la web:\n${detalle}\nTotal: ${pesosCliente(subtotal)}`;
  return linkWhatsapp(numero, texto) ?? `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
