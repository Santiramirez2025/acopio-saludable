"use client";

import Link from "next/link";
import { BarraMinimo, pesosCliente, useCarrito } from "./Carrito";

const NAV = [
  ["/catalogo", "Catálogo"],
  ["/nichos", "Por negocio"],
  ["/objetivos", "Por objetivo"],
  ["/combos", "Combos"],
  ["/armador", "Armá tu pedido"],
];

export function Encabezado() {
  const { cotizacion, lineas } = useCarrito();
  const unidades = lineas.reduce((s, l) => s + l.cantidad, 0);
  return (
    <header className="sticky top-0 z-20 border-b border-tierra-200 bg-tierra-50/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="font-display text-xl font-semibold leading-none text-acopio-700">
          Acopio <span className="text-tierra-500">Saludable</span>
        </Link>
        <form action="/catalogo" className="ml-auto hidden flex-1 justify-end sm:flex">
          <input name="q" className="campo max-w-xs" placeholder="Buscar productos" aria-label="Buscar productos" />
        </form>
        <Link href="/carrito" className="ml-auto flex items-center gap-2 rounded-md bg-acopio-600 px-3 py-2 text-sm font-medium text-white sm:ml-0">
          Carrito
          <span className="rounded-full bg-white/20 px-1.5 text-xs tabular-nums">{unidades}</span>
          {cotizacion && cotizacion.subtotal > 0 && <span className="hidden tabular-nums sm:inline">{pesosCliente(cotizacion.subtotal)}</span>}
        </Link>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-5 overflow-x-auto px-4 pb-2 text-sm text-stone-700">
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className="whitespace-nowrap hover:text-acopio-700">{label}</Link>
        ))}
      </nav>
      {unidades > 0 && <BarraMinimo compacta />}
    </header>
  );
}
