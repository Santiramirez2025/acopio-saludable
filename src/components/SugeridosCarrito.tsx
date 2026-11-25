"use client";

import Link from "next/link";
import { pesosCliente, useCarrito } from "./Carrito";
import { Foto } from "./Foto";

export type Sugerido = { tipo: "producto" | "combo"; id: string; nombre: string; detalle: string; precio: number; fotoUrl: string | null; href: string };

/**
 * Experimento B de Martín (21/11): en el carrito, los dos mixes de la casa y el Trío, con el precio vigente.
 * Se mide con los «agregar» desde /carrito (el evento ya sale con la página) y el ticket de los pedidos web.
 * No se muestra lo que ya está en el carrito.
 */
export function SugeridosCarrito({ items }: { items: Sugerido[] }) {
  const { lineas, listo, agregar } = useCarrito();
  if (!listo || lineas.length === 0) return null;
  const quedan = items.filter((s) => !lineas.some((l) => l.tipo === s.tipo && l.id === s.id));
  if (quedan.length === 0) return null;
  return (
    <section className="mt-4 rounded-xl border border-tierra-200 bg-white p-4" aria-labelledby="sugeridos-titulo">
      <h2 id="sugeridos-titulo" className="text-sm font-semibold">Lo que más se lleva</h2>
      <ul className="mt-2 divide-y divide-tierra-100">
        {quedan.map((s) => (
          <li key={`${s.tipo}:${s.id}`} className="flex items-center gap-3 py-2.5">
            <Foto src={s.fotoUrl} alt="" etiqueta=" " className="h-14 w-14 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1">
              <Link href={s.href} className="line-clamp-2 text-sm leading-snug font-medium hover:underline">{s.nombre}</Link>
              <p className="text-xs text-stone-600">
                {s.detalle} · <b className="tabular-nums text-stone-800">{pesosCliente(s.precio)}</b>
              </p>
            </div>
            <button type="button" className="btn-sec shrink-0 px-3 py-2 text-sm" aria-label={`Sumar ${s.nombre}`} onClick={() => agregar([{ tipo: s.tipo, id: s.id, cantidad: 1 }])}>
              Sumar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
