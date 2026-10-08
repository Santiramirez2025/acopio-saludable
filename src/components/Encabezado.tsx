"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { pesosCliente, useCarrito } from "./Carrito";

const NAV = [
  ["/catalogo", "Catálogo"],
  ["/nichos", "Por negocio"],
  ["/objetivos", "Por objetivo"],
  ["/combos", "Combos"],
  ["/armador", "Armá tu pedido"],
];

const Icono = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const ICONOS = {
  inicio: "M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10",
  catalogo: "M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z",
  armar: "M12 3v18M3 12h18",
  combos: "M4 8l8-4 8 4-8 4-8-4zM4 8v8l8 4 8-4V8M12 12v8",
  carrito: "M3 4h2.5l2.2 11h10.6L20.5 7H7M9.5 19.5h.01M17 19.5h.01",
};

export function Encabezado() {
  const { cotizacion, lineas } = useCarrito();
  const unidades = lineas.reduce((s, l) => s + l.cantidad, 0);
  return (
    <header className="sticky top-0 z-30 bg-acopio-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="font-display text-[22px] font-extrabold leading-none tracking-tight" aria-label="Acopio Saludable, inicio">
          acopio<span className="text-sol">.</span>
        </Link>
        <form action="/catalogo" role="search" className="flex-1">
          <input name="q" type="search" enterKeyHint="search" className="w-full rounded-full border-0 bg-white/12 px-4 py-2 text-[15px] text-white placeholder:text-white/60 focus:bg-white focus:text-acopio-900 focus:outline-none focus:placeholder:text-stone-400" placeholder="Buscá nueces, avena, magnesio…" aria-label="Buscar productos" />
        </form>
        <Link href="/carrito" className="hidden items-center gap-2 rounded-full bg-sol px-4 py-2 text-sm font-bold text-acopio-900 md:flex">
          Tu pedido
          {unidades > 0 && <span className="tabular-nums">{cotizacion ? pesosCliente(cotizacion.subtotal) : unidades}</span>}
        </Link>
      </div>
      <nav className="mx-auto hidden max-w-6xl gap-6 px-4 pb-2.5 text-sm font-medium text-white/80 md:flex" aria-label="Secciones">
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className="hover:text-white">{label}</Link>
        ))}
      </nav>
    </header>
  );
}

/** Barra inferior del celular: las cinco cosas que hace un cliente, siempre a un toque. */
export function BarraInferior() {
  const ruta = usePathname();
  const { lineas } = useCarrito();
  const unidades = lineas.reduce((s, l) => s + l.cantidad, 0);
  const items = [
    ["/", "Inicio", ICONOS.inicio],
    ["/catalogo", "Catálogo", ICONOS.catalogo],
    ["/armador", "Armar", ICONOS.armar],
    ["/combos", "Combos", ICONOS.combos],
    ["/carrito", "Pedido", ICONOS.carrito],
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-tierra-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Navegación principal">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(([href, nombre, d]) => {
          const activo = href === "/" ? ruta === "/" : ruta.startsWith(href);
          const centro = href === "/armador";
          return (
            <li key={href}>
              <Link href={href} aria-current={activo ? "page" : undefined} className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${activo ? "text-acopio-600" : "text-stone-500"}`}>
                <span className={centro ? "-mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-sol text-acopio-900 shadow-ficha" : ""}><Icono d={d} /></span>
                {nombre}
                {href === "/carrito" && unidades > 0 && (
                  <span className="absolute right-[18%] top-1 min-w-[18px] rounded-full bg-acopio-900 px-1 text-center text-[10px] font-bold leading-[18px] text-white tabular-nums">{unidades > 99 ? "99+" : unidades}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * El medidor del pedido: aparece apenas hay algo en el carrito y acompaña toda la compra.
 * Muestra cuánto falta para la compra mínima y lleva al paso siguiente con un toque.
 */
export function MedidorPedido() {
  const ruta = usePathname();
  const { cotizacion, lineas } = useCarrito();
  if (!lineas.length || !cotizacion || cotizacion.subtotal <= 0) return null;
  if (ruta.startsWith("/carrito") || ruta.startsWith("/checkout") || ruta.startsWith("/pedido")) return null;
  const { falta, progresoPct, subtotal, puedePagar } = cotizacion;
  return (
    <div className="fixed inset-x-3 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md md:inset-x-auto md:bottom-5 md:right-5 md:w-[380px]">
      <Link href={puedePagar ? "/checkout" : "/carrito"} className="block overflow-hidden rounded-2xl bg-acopio-900 text-white shadow-dock" aria-label={puedePagar ? "Finalizar la compra" : "Ver tu pedido"}>
        <div className="flex items-center gap-3 px-4 pb-2.5 pt-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold leading-none tabular-nums">{pesosCliente(subtotal)}</p>
            <p className="mt-1 truncate text-xs text-white/75" aria-live="polite">
              {falta > 0 ? `Te faltan ${pesosCliente(falta)} para el mínimo` : "Llegaste al mínimo. Ya podés comprar."}
            </p>
          </div>
          <span className="rounded-full bg-sol px-4 py-2 text-sm font-bold text-acopio-900">{puedePagar ? "Comprar" : "Ver pedido"}</span>
        </div>
        <div className="h-1.5 bg-white/15" role="progressbar" aria-valuenow={progresoPct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso hacia la compra mínima">
          <div className={`h-full transition-all duration-500 ${falta > 0 ? "bg-sol" : "bg-acopio-500"}`} style={{ width: `${progresoPct}%` }} />
        </div>
      </Link>
    </div>
  );
}
