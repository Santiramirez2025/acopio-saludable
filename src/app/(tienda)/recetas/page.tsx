// Recetario (orden de Santiago, 12/11): recetas sin humo con nuestros productos, para que el cliente sepa qué hacer
// con lo que compra y vuelva por más. Cada receta tiene su tarjeta (imagen para WhatsApp) y está en la ficha de cada producto.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MOMENTOS, RECETAS, tiempoTexto } from "@/lib/recetas";
import { Titulo } from "@/components/Tienda";

export const metadata: Metadata = {
  title: "Recetas con frutos secos, semillas y legumbres",
  description: "Recetas fáciles y probadas con lo que vendemos: granola casera, bolitas de dátiles, leche de almendras, hummus, pan con semillas y más. Medidas claras y el porqué de cada paso.",
  alternates: { canonical: "/recetas" },
};

export default function Recetas() {
  return (
    <div className="space-y-8">
      <Titulo sobre="Recetario Acopio" bajada="Lo que podés hacer con lo que comprás: medidas claras, paso a paso y el porqué de cada truco. Sin humo.">Recetas con nuestros productos</Titulo>
      <a href="/descargas/recetario-acopio.pdf" download className="flex max-w-2xl items-center justify-between gap-4 rounded-2xl bg-acopio-900 p-5 text-white">
        <span><span className="block font-display text-xl font-bold">Descargá la guía completa</span><span className="text-sm text-white/80">Las {RECETAS.length} recetas en un PDF para tener en el celu o imprimir y pegar en la heladera.</span></span>
        <span className="shrink-0 rounded-full bg-amber-400 px-5 py-3 font-bold text-black">PDF</span>
      </a>
      {MOMENTOS.map((m) => {
        const lista = RECETAS.filter((r) => r.momento === m);
        if (!lista.length) return null;
        return (
          <section key={m}>
            <h2 className="mb-3 font-display text-2xl font-black text-acopio-900">{m}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lista.map((r) => (
                <li key={r.slug}>
                  <Link href={`/recetas/${r.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-ficha">
                    <div className="relative aspect-[5/3]"><Image src={`/img/recetas/${r.slug}.jpg`} alt={r.titulo} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover object-top" /></div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="font-display text-lg font-bold leading-tight group-hover:underline">{r.titulo}</h3>
                      <p className="mt-1 text-sm text-stone-600">{r.bajada}</p>
                      <span className="mt-auto pt-3 text-xs font-semibold text-acopio-700">{tiempoTexto(r)} · {r.dificultad}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
