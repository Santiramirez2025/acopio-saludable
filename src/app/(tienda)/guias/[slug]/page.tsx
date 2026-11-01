import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIAS, fechaLarga } from "@/lib/guias";
import { combosTienda, productosTienda } from "@/lib/tienda";
import { pesos } from "@/lib/precios";
import { SITIO, urlSitio } from "@/lib/sitio";
import { Prosa } from "@/components/Prosa";
import { EnlaceWhatsapp } from "@/components/Whatsapp";
import { RielProductos, TarjetaCombo, Titulo, TituloSeccion } from "@/components/Tienda";

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
  const [productos, combos] = await Promise.all([
    productosTienda({ where: { categoria: g.gondola }, take: 8 }),
    g.combo ? combosTienda({ slug: g.combo.slug }) : Promise.resolve([]),
  ]);
  // Rinde del combo con el contenido y el precio vigentes (no se escribe a mano en la guía).
  const combo = combos.find((c) => c.disponible);
  const gramosCombo = combo ? combo.items.reduce((s, i) => s + (i.producto.contenido ?? 0) * i.cantidad, 0) : 0;
  const rinde = combo && g.combo && gramosCombo > 0 ? Math.floor(gramosCombo / g.combo.gramosPorUnidad) : 0;
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
        {combo && g.combo && (
          // Atajo arriba: quien llega desde Google con la compra en mente no tiene que leer toda la guía para encontrar el kit.
          <div className="mt-4 flex max-w-2xl flex-col gap-3 rounded-2xl border border-tierra-200 bg-white p-4 shadow-ficha sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] text-stone-800">
              <span className="font-semibold">¿Lo querés resuelto?</span> {combo.nombre}: {pesos(combo.precio)}
              {rinde > 0 ? `, alcanza para unos ${rinde} ${g.combo.unidad}` : ""}.
            </p>
            <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
              <Link href={`/combos/${combo.slug}`} className="btn">Ver el kit</Link>
              <EnlaceWhatsapp
                mensaje={`Hola! Vengo de la guía «${g.titulo}». Quiero el ${combo.nombre}.`}
                className="min-h-[48px] text-sm font-semibold text-acopio-900 underline underline-offset-4"
              >
                Pedirlo por WhatsApp
              </EnlaceWhatsapp>
            </div>
          </div>
        )}
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
      {combo && g.combo && (
        <section className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_300px] sm:items-start">
          <div className="space-y-2">
            <TituloSeccion href={`/combos/${combo.slug}`} enlace="Ver el combo">Todo junto: {combo.nombre}</TituloSeccion>
            <p className="max-w-xl text-[15px] text-stone-700">
              Trae {combo.items.map((i) => i.producto.producto).join(", ")}
              {rinde > 0 ? `: con unos ${g.combo.gramosPorUnidad} g de relleno por pan, alcanza para unos ${rinde} ${g.combo.unidad} (cerca de ${pesos(combo.precio / rinde)} por unidad).` : "."} Sale {pesos(combo.precio)} con los precios de hoy.
            </p>
          </div>
          <TarjetaCombo c={combo} />
        </section>
      )}
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
