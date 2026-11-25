// El regalo para quien ya compró (Santiago, 15/11): el recetario, pensado para usar lo que ya tiene en casa.
// Llega por WhatsApp una sola vez. No es una página de venta: primero las recetas, y al final cómo reponer.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RECETAS, tiempoTexto } from "@/lib/recetas";

export const metadata: Metadata = {
  title: "Tu regalo: el recetario de Acopio",
  description: "Gracias por tu compra. Recetas fáciles con frutos secos, semillas y dátiles.",
  robots: { index: false, follow: false },
};

// Las que se hacen con lo que más se lleva (mix, dátiles, pasas, semillas, granola), primero.
const PRIMERAS = [
  "bolitas-de-datiles-y-nuez-sin-horno",
  "granola-casera-con-mix-de-frutos-secos",
  "datiles-rellenos",
  "avena-nocturna-con-semillas-y-datiles",
  "galletitas-de-avena-pasas-y-nuez",
  "bowl-de-yogur-con-granola-y-frutos-secos",
];

export default function Regalo() {
  const primeras = PRIMERAS.map((s) => RECETAS.find((r) => r.slug === s)).filter((r) => r !== undefined);
  return (
    <div className="space-y-8">
      <section className="rounded-[28px] bg-acopio-900 p-6 text-white sm:p-10">
        <p className="inline-flex rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-black">🎁 Un regalo para vos</p>
        <h1 className="mt-3 text-balance font-display text-[clamp(28px,8vw,44px)] font-extrabold leading-none tracking-tight">Gracias por comprarnos. Acá va tu recetario.</h1>
        <p className="mt-3 max-w-xl text-[15px] text-white/80 sm:text-[17px]">{RECETAS.length} recetas fáciles para hacer con lo que ya tenés en casa: medidas claras, paso a paso y sin ingredientes raros.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="/descargas/recetario-acopio.pdf" download className="inline-flex min-h-[52px] items-center rounded-full bg-amber-400 px-6 font-bold text-black">Descargar el recetario (PDF)</a>
          <Link href="/recetas" className="inline-flex min-h-[52px] items-center rounded-full bg-white/10 px-6 font-semibold text-white ring-1 ring-white/30">Ver las {RECETAS.length} recetas</Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl font-black text-acopio-900">Las 3 recetas del Trío, y 3 más</h2>
        <p className="-mt-2 mb-3 text-sm text-stone-600">Las tres primeras salen con lo que trae el Trío: mix, dátiles y pasas.</p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {primeras.map((r) => (
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

      <section className="rounded-2xl bg-white p-5 shadow-ficha sm:p-6">
        <h2 className="font-display text-xl font-bold">¿Se te terminó algo?</h2>
        <p className="mt-1 text-sm text-stone-700">El Kit semanal trae granola, mix con cajú, dátiles y semillas para toda la semana. En Carlos Paz te lo llevamos a tu casa y lo pagás al recibir.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/combos/kit-semanal?utm_source=whatsapp&utm_campaign=regalo-recetas" className="btn-comprar">Ver el Kit semanal</Link>
          <Link href="/catalogo?utm_source=whatsapp&utm_campaign=regalo-recetas" className="inline-flex min-h-[48px] items-center text-sm font-semibold text-acopio-900 underline underline-offset-4">Ver todo el catálogo</Link>
        </div>
      </section>
    </div>
  );
}
