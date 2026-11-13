import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RECETAS, tiempoTexto } from "@/lib/recetas";
import { productosTienda } from "@/lib/tienda";
import { urlSitio } from "@/lib/sitio";
import { EnlaceWhatsapp } from "@/components/Whatsapp";
import { RielProductos, TituloSeccion } from "@/components/Tienda";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return RECETAS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = RECETAS.find((x) => x.slug === slug);
  return r ? { title: `${r.titulo} · receta`, description: r.bajada, alternates: { canonical: `/recetas/${r.slug}` }, openGraph: { title: r.titulo, description: r.bajada, images: [`/img/recetas/${r.slug}.jpg`] } } : {};
}

export const revalidate = 3600;

export default async function RecetaPagina({ params }: Props) {
  const { slug } = await params;
  const r = RECETAS.find((x) => x.slug === slug);
  if (!r) notFound();
  const codigos = [...new Set(r.ingredientes.map((i) => i.codigo).filter((c): c is string => !!c))];
  const productos = await productosTienda({ where: { codigo: { in: codigos } } });
  const disponibles = new Set(productos.map((p) => p.codigo));
  const base = urlSitio();
  const datos = {
    "@context": "https://schema.org", "@type": "Recipe", name: r.titulo, description: r.bajada, image: [`${base}/img/recetas/${r.slug}.jpg`],
    totalTime: `PT${r.minutos}M`, recipeYield: r.rinde, recipeCategory: r.momento, inLanguage: "es-AR",
    recipeIngredient: r.ingredientes.map((i) => `${i.cantidad} ${i.que}`),
    recipeInstructions: r.pasos.map((p) => ({ "@type": "HowToStep", text: p })),
    author: { "@type": "Organization", name: "Acopio Saludable" },
  };
  return (
    <article className="space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }} />
      <Link href="/recetas" className="-my-3 inline-flex min-h-[48px] items-center text-sm text-stone-600 underline underline-offset-4">← Recetas</Link>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_380px] md:items-start">
        <div className="space-y-4">
          <div className="text-sm font-semibold uppercase tracking-widest text-acopio-600">{r.momento}</div>
          <h1 className="text-balance font-display text-3xl font-black leading-tight text-acopio-900 md:text-5xl">{r.titulo}</h1>
          <p className="max-w-2xl text-lg text-stone-700">{r.bajada}</p>
          <div className="flex flex-wrap gap-2 text-sm font-semibold">
            {[`⏱ ${tiempoTexto(r)}`, `🍽 ${r.rinde}`, `👩‍🍳 ${r.dificultad}`].map((t) => <span key={t} className="rounded-full bg-acopio-100 px-3 py-1.5 text-acopio-900">{t}</span>)}
          </div>
          <div className="relative aspect-[5/2] overflow-hidden rounded-3xl"><Image src={r.foto} alt={r.titulo} fill priority sizes="(min-width:768px) 60vw, 100vw" className="object-cover" /></div>
        </div>
        <aside className="rounded-3xl bg-white p-5 shadow-ficha">
          <h2 className="font-display text-xl font-black text-acopio-900">Ingredientes</h2>
          <ul className="mt-3 space-y-2.5">
            {r.ingredientes.map((i) => (
              <li key={i.que} className="flex gap-2.5 text-[15px]">
                <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${i.codigo ? "bg-amber-400" : "border border-stone-300"}`} />
                <span><b>{i.cantidad}</b> {i.codigo && disponibles.has(i.codigo) ? <Link href={`/producto/${i.codigo}`} className="underline underline-offset-4">{i.que}</Link> : i.que}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-stone-500">● Lo tenemos en Acopio, fraccionado en el día.</p>
          <a href={`/img/recetas/${r.slug}.jpg`} download className="btn mt-4 w-full justify-center">Guardar la receta en el celu</a>
        </aside>
      </div>

      <section className="max-w-3xl">
        <h2 className="font-display text-2xl font-black text-acopio-900">Paso a paso</h2>
        <ol className="mt-4 space-y-4">
          {r.pasos.map((p, i) => (
            <li key={p} className="flex gap-4 text-[17px] leading-relaxed text-stone-800">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-acopio-900 font-bold text-amber-300">{i + 1}</span>
              <span className="pt-1">{p}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-3xl rounded-3xl bg-acopio-900 p-6 text-white">
        <h2 className="font-display text-2xl font-black text-amber-300">Por qué funciona</h2>
        <ul className="mt-3 space-y-3">
          {r.claves.map((c) => <li key={c} className="flex gap-3 text-[16px] leading-relaxed"><span aria-hidden="true" className="text-amber-300">→</span>{c}</li>)}
        </ul>
        <p className="mt-4 border-t border-white/20 pt-4 text-[15px] text-white/85"><b className="text-white">Cómo se guarda:</b> {r.guardar}</p>
      </section>

      {productos.length > 0 && (
        <section>
          <TituloSeccion>Lo que necesitás, fraccionado en el día</TituloSeccion>
          <RielProductos productos={productos} />
          <EnlaceWhatsapp mensaje={`Hola! Quiero hacer «${r.titulo}». ¿Me arman lo que necesito?`} className="btn-comprar mt-4 inline-flex">
            Pedirme todo por WhatsApp
          </EnlaceWhatsapp>
        </section>
      )}

      <section>
        <TituloSeccion href="/recetas" enlace="Ver todas">Más recetas</TituloSeccion>
        <ul className="grid gap-2 sm:grid-cols-2">
          {RECETAS.filter((x) => x.slug !== r.slug && x.productos.some((p) => r.productos.includes(p))).slice(0, 4).map((x) => (
            <li key={x.slug}><Link href={`/recetas/${x.slug}`} className="flex min-h-[48px] items-center rounded-xl bg-white px-4 py-3 text-sm font-semibold shadow-ficha hover:underline">{x.titulo}</Link></li>
          ))}
        </ul>
      </section>
    </article>
  );
}
