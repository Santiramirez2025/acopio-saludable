"use client";

import { useState } from "react";
import type { ProductoTienda } from "@/lib/tienda";
import { BotonCargarPedido, pesosCliente } from "./Carrito";
import { Foto } from "./Foto";
import { BotonCompartir, enlacePedido } from "./Compartir";

/** Pedido tipo con cantidades editables y botón para cargarlo entero al carrito. */
export function PedidoEditable({ items, compraMinima, etiqueta = "Cargar este pedido al carrito" }: { items: { producto: ProductoTienda; cantidad: number }[]; compraMinima: number; etiqueta?: string }) {
  const [cantidades, setCantidades] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.producto.codigo, i.cantidad])));
  const total = items.reduce((s, i) => s + i.producto.precio * (cantidades[i.producto.codigo] ?? 0), 0);
  const fijar = (codigo: string, n: number) => setCantidades((c) => ({ ...c, [codigo]: Math.max(0, Math.min(999, n)) }));
  const lineas = items.filter((i) => (cantidades[i.producto.codigo] ?? 0) > 0).map((i) => ({ tipo: "producto" as const, id: i.producto.codigo, cantidad: cantidades[i.producto.codigo] }));
  return (
    <div className="rounded-xl border border-tierra-200 bg-white">
      <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-tierra-200 bg-acopio-50 px-4 py-3 text-sm">
        <span><b>{lineas.length} productos</b> · total <b className="tabular-nums">{pesosCliente(total)}</b></span>
        <span className="text-stone-600">Precios de hoy. Cambiá cantidades con + y −; con 0 lo sacás.</span>
      </p>
      <ul className="divide-y divide-tierra-100">
        {items.map(({ producto: p }) => {
          const n = cantidades[p.codigo] ?? 0;
          return (
            <li key={p.codigo} className={`flex items-center gap-3 p-3 ${n === 0 ? "opacity-50" : ""}`}>
              <Foto src={p.fotoUrl} alt="" etiqueta=" " className="h-14 w-14 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <a href={`/producto/${encodeURIComponent(p.codigo)}`} className="line-clamp-2 text-sm font-medium leading-snug hover:underline">{p.producto}</a>
                <p className="truncate text-xs text-stone-600">{p.presentacion} · {pesosCliente(p.precio)} c/u</p>
              </div>
              <div className="flex items-center rounded-md border border-stone-300">
                <button type="button" className="paso" aria-label={`Restar ${p.producto}`} onClick={() => fijar(p.codigo, n - 1)}>−</button>
                <input className="w-11 h-12 border-0 bg-transparent p-0 text-center text-sm font-semibold tabular-nums" inputMode="numeric" aria-label={`Cantidad de ${p.producto}`} value={n} onChange={(e) => fijar(p.codigo, Number.parseInt(e.target.value, 10) || 0)} />
                <button type="button" className="paso" aria-label={`Sumar ${p.producto}`} onClick={() => fijar(p.codigo, n + 1)}>+</button>
              </div>
              <span className="hidden w-24 text-right text-sm tabular-nums sm:block">{pesosCliente(p.precio * n)}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tierra-200 p-4">
        <div>
          <p className="text-lg font-semibold tabular-nums">{pesosCliente(total)}</p>
          <p className="text-xs text-stone-600">
            {total >= compraMinima ? "Llega a la compra mínima" : `Faltan ${pesosCliente(compraMinima - total)} para la compra mínima de ${pesosCliente(compraMinima)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotonCompartir etiqueta="Enviar por WhatsApp" texto="Te paso este pedido de Acopio Saludable, con los precios de hoy. Podés ajustarlo antes de comprar:" ruta={enlacePedido(lineas)} />
          <BotonCargarPedido etiqueta={etiqueta} lineas={lineas} />
        </div>
      </div>
    </div>
  );
}
