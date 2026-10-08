"use client";

import Link from "next/link";
import { BarraMinimo, pesosCliente, useCarrito } from "./Carrito";
import { Foto } from "./Foto";

export function VistaCarrito() {
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
  const { puedePagar, falta, subtotal } = cotizacion;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-4 rounded-xl border border-tierra-200 bg-white p-4">
          <BarraMinimo />
        </div>
        <ul className="divide-y divide-tierra-100 rounded-xl border border-tierra-200 bg-white">
          {cotizacion.lineas.map((l) => (
            <li key={`${l.tipo}:${l.id}`} className="flex items-center gap-3 p-3">
              <Foto src={l.fotoUrl} alt="" etiqueta=" " className="h-16 w-16 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <Link href={l.href} className="block truncate text-sm font-medium hover:underline">{l.nombre}</Link>
                <p className="truncate text-xs text-stone-600">{l.detalle}</p>
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
        <p className="text-xs text-stone-600">El envío se calcula en el paso siguiente.</p>
        {puedePagar && !cotizando ? (
          <Link href="/checkout" className="btn w-full">Continuar con la compra</Link>
        ) : (
          <button type="button" className="btn w-full" disabled aria-describedby="motivo-bloqueo">Continuar con la compra</button>
        )}
        {!puedePagar && (
          <p id="motivo-bloqueo" className="text-sm text-tierra-700">
            Te faltan {pesosCliente(falta)} para llegar a la compra mínima. <Link href="/catalogo" className="underline">Seguir sumando</Link>
          </p>
        )}
      </aside>
    </div>
  );
}
