"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProductoTienda } from "@/lib/tienda";
import { TarjetaProducto } from "./Tienda";

type Grupo = { id: string; nombre: string; total: number; productos: ProductoTienda[] };

/** Tarjetas clickeables: al elegir un objetivo se muestran sus productos sin salir de la página. */
export function ExploradorObjetivos({ grupos }: { grupos: Grupo[] }) {
  const [activo, setActivo] = useState(grupos[0]?.id ?? "");
  const grupo = grupos.find((g) => g.id === activo);
  return (
    <div>
      <div role="tablist" aria-label="Objetivos de bienestar" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {grupos.map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={g.id === activo}
            onClick={() => setActivo(g.id)}
            className={`rounded-xl border p-4 text-left transition ${g.id === activo ? "border-acopio-600 bg-acopio-600 text-white" : "border-tierra-200 bg-white hover:border-acopio-500"}`}
          >
            <span className="font-display text-lg font-semibold">{g.nombre}</span>
            <span className={`mt-1 block text-xs ${g.id === activo ? "text-acopio-100" : "text-stone-500"}`}>{g.total} productos</span>
          </button>
        ))}
      </div>
      {grupo && (
        <div role="tabpanel" className="mt-8">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-semibold text-acopio-900">Productos que la gente elige para {grupo.nombre.toLowerCase()}</h2>
            <Link href={`/objetivos/${grupo.id}`} className="text-sm text-acopio-700 underline">Ver los {grupo.total}</Link>
          </div>
          {grupo.productos.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{grupo.productos.map((p) => <TarjetaProducto key={p.codigo} p={p} />)}</div>
          ) : (
            <p className="text-stone-600">Todavía no hay productos cargados en este objetivo.</p>
          )}
        </div>
      )}
    </div>
  );
}
