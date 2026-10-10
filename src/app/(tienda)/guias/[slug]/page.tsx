import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIAS, fechaLarga } from "@/lib/guias";
import { productosTienda } from "@/lib/tienda";
import { SITIO, urlSitio } from "@/lib/sitio";
import { Prosa } from "@/components/Prosa";
import { RielProductos, Titulo, TituloSeccion } from "@/components/Tienda";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GUIAS.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const g = GUIAS.find((x) => x.slug === slug);
  return g ? { title: g.titulo, description: g.descripcion, alternates: { canonical: `/guias/${g.slug}` }, openGraph: { type: "article", title: g.titulo, description: g.descripcion, modifiedTime: g.actualizada } } : {};
}

export const revalidate = 3600;

export default async function GuiaPagina({ params }: Props) {
  const { slug } = await params;
  const g = GUIAS.find((x) => x.slug === slug);
  if (!g) notFound();
  const productos = await productosTienda({ where: { categoria: g.gondola }, take: 8 });
  const base = urlSitio();
  const datos = [
    { "@context": "https://schema.org", "@type": "Article", headline: g.titulo, description: g.descripcion, dateModified: g.actualizada, datePublished: g.actualizada, inLanguage: "es-AR", mainEntityOfPage: `${base}/guias/${g.slug}`, author: { "@type": "Organization", name: SITIO.nombre }, publisher: { "@type": "Organization", name: SITIO.nombre, logo: { "@type": "ImageObject", url: `${base}/marca/acopio-isotipo.svg` } } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Guías", item: `${base}/guias` }, { "@type": "ListItem", position: 2, name: g.titulo }] },
  ];
  return (
    <article className="space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }} />
      <div>
        <Link href="/guias" className="-my-3 inline-flex min-h-[48px] items-center text-sm text-stone-600 underline underline-offset-4">← Guías</Link>
        <Titulo sobre={`Actualizada el ${fechaLarga(g.actualizada)}`} bajada={g.descripcion}>{g.titulo}</Titulo>
        <ul className="max-w-2xl space-y-2 rounded-2xl bg-acopio-100 p-5 text-[15px] font-medium text-acopio-900">
          {g.resumen.map((r) => (
            <li key={r} className="flex gap-2.5"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-acopio-600" />{r}</li>
          ))}
        </ul>
      </div>
      <Prosa>
        {g.secciones.map((s) => (
          <section key={s.titulo} className="space-y-3">
            <h2>{s.titulo}</h2>
            {s.parrafos?.map((p) => <p key={p}>{p}</p>)}
            {s.lista && <ul>{s.lista.map((l) => <li key={l}>{l}</li>)}</ul>}
          </section>
        ))}
        {g.fuentes && (
          <section className="space-y-2 border-t border-tierra-200 pt-4 text-sm">
            <h2 className="!pt-0 !text-base">Fuentes para consultar</h2>
            <ul>{g.fuentes.map((f) => <li key={f.url}><a href={f.url} target="_blank" rel="noopener noreferrer">{f.nombre}</a></li>)}</ul>
          </section>
        )}
      </Prosa>
      {productos.length > 0 && (
        <section>
          <TituloSeccion href={`/catalogo?categoria=${encodeURIComponent(g.gondola)}`} enlace="Ver la góndola">{g.gondola} por volumen</TituloSeccion>
          <RielProductos productos={productos} />
        </section>
      )}
      <section>
        <TituloSeccion>Otras guías</TituloSeccion>
        <ul className="grid gap-2 sm:grid-cols-2">
          {GUIAS.filter((x) => x.slug !== g.slug).slice(0, 4).map((x) => (
            <li key={x.slug}><Link href={`/guias/${x.slug}`} className="flex min-h-[48px] items-center rounded-xl bg-white px-4 py-3 text-sm font-semibold shadow-ficha hover:underline">{x.titulo}</Link></li>
          ))}
        </ul>
      </section>
    </article>
  );
}
