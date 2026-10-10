import type { Metadata } from "next";
import Link from "next/link";
import { GUIAS, fechaLarga } from "@/lib/guias";
import { Titulo } from "@/components/Tienda";

export const metadata: Metadata = { title: "Guías para comprar y conservar por kilo", description: "Guías prácticas: cómo conservar frutos secos, cuánto rinden la granola y las legumbres, qué harinas sin TACC usar y cómo armar el desayuno de un alojamiento.", alternates: { canonical: "/guias" } };

export default function Guias() {
  return (
    <div>
      <Titulo sobre="Guías" bajada="Respuestas cortas a lo que más nos preguntan: cuánto comprar, cuánto rinde y cómo guardarlo.">Guías para comprar y conservar por kilo</Titulo>
      <ul className="grid gap-3 sm:grid-cols-2">
        {GUIAS.map((g) => (
          <li key={g.slug}>
            <Link href={`/guias/${g.slug}`} className="group flex h-full flex-col rounded-2xl bg-white p-5 shadow-ficha">
              <span className="text-xs font-semibold text-acopio-600">{g.gondola}</span>
              <h2 className="mt-1 font-display text-xl font-bold leading-tight group-hover:underline">{g.titulo}</h2>
              <p className="mt-2 text-sm text-stone-600">{g.descripcion}</p>
              <span className="mt-auto pt-3 text-xs text-stone-500">Actualizada el {fechaLarga(g.actualizada)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-stone-600">¿Buscás lo último del catálogo? Mirá las <Link href="/novedades" className="font-semibold text-acopio-700 underline underline-offset-4">novedades y bajas de precio</Link>, que se actualizan solas.</p>
    </div>
  );
}
