import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { aTienda, combosTienda, estaPublicado, productosTienda } from "@/lib/tienda";
import { NICHOS, OBJETIVOS } from "@/lib/taxonomia";
import { pesos, precioPorUnidadBase } from "@/lib/precios";
import { urlSitio } from "@/lib/sitio";
import { Foto } from "@/components/Foto";
import { BotonAgregar } from "@/components/Carrito";
import { AvisoSuplementos, GrillaProductos, TarjetaCombo } from "@/components/Tienda";

type Props = { params: Promise<{ codigo: string }> };

async function cargar(codigoCrudo: string) {
  const codigo = decodeURIComponent(codigoCrudo); // texto: conserva ceros a la izquierda
  const [p, cfg] = await Promise.all([prisma.product.findUnique({ where: { codigo } }), leerConfig()]);
  return p && estaPublicado(p, cfg.margenMinimoPct) ? p : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await cargar((await params).codigo);
  if (!p) return { title: "Producto no disponible" };
  const titulo = `${p.producto} ${p.presentacion}`;
  return {
    title: titulo,
    description: `${titulo} de ${p.marca}. Comprá por volumen en Acopio Saludable, con envíos a todo el país.`,
    alternates: { canonical: `/producto/${encodeURIComponent(p.codigo)}` },
    openGraph: { title: titulo, images: p.fotoUrl ? [p.fotoUrl] : undefined },
  };
}

export default async function Producto({ params }: Props) {
  const fila = await cargar((await params).codigo);
  if (!fila) notFound();
  const p = aTienda(fila);
  const porUnidad = precioPorUnidadBase(p.precio, p.contenido, p.unidad);
  const [combos, relacionados] = await Promise.all([
    combosTienda({ tipo: "COMBO", activo: true, items: { some: { codigo: p.codigo } } }),
    productosTienda({ where: { categoria: p.categoria, codigo: { not: p.codigo } }, take: 4 }),
  ]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${p.producto} ${p.presentacion}`,
    sku: p.codigo,
    brand: { "@type": "Brand", name: p.marca },
    category: p.categoria,
    image: fila.fotos.length ? fila.fotos : undefined,
    offers: {
      "@type": "Offer",
      price: p.precio.toFixed(2),
      priceCurrency: "ARS",
      availability: "https://schema.org/InStock",
      url: `${urlSitio()}/producto/${encodeURIComponent(p.codigo)}`,
    },
  };

  return (
    <div className="space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="text-sm text-stone-500">
        <Link href="/catalogo" className="underline">Catálogo</Link> ·{" "}
        <Link href={`/catalogo?categoria=${encodeURIComponent(p.categoria)}`} className="underline">{p.categoria}</Link>
      </nav>
      <div className="grid gap-8 md:grid-cols-2">
        <Foto src={p.fotoUrl} alt={`${p.producto} ${p.presentacion}`} etiqueta={p.categoria} className="aspect-square w-full rounded-2xl border border-tierra-200" />
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-tierra-500">{p.marca}</p>
            <h1 className="font-display text-3xl font-semibold text-acopio-900">{p.producto}</h1>
            <p className="mt-1 text-stone-600">{p.presentacion}</p>
          </div>
          <div>
            <p className="text-3xl font-semibold tabular-nums">{pesos(p.precio)}</p>
            {porUnidad && <p className="text-sm tabular-nums text-stone-500">{pesos(porUnidad.valor)} {porUnidad.etiqueta}</p>}
          </div>
          <BotonAgregar id={p.codigo} etiqueta="Agregar al carrito" className="max-w-sm" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-tierra-200 bg-white p-4 text-sm">
            <dt className="text-stone-500">Presentación</dt><dd>{p.presentacion}</dd>
            <dt className="text-stone-500">Formato</dt><dd>{p.formato}</dd>
            {p.contenido && (<><dt className="text-stone-500">Contenido</dt><dd>{p.contenido} {p.unidad}</dd></>)}
            <dt className="text-stone-500">Código</dt><dd className="font-mono text-xs">{p.codigo}</dd>
          </dl>
          {fila.porQueLoElegimos && (
            <div className="rounded-xl bg-acopio-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-acopio-600">Por qué lo elegimos</p>
              <p className="text-sm text-stone-700">{fila.porQueLoElegimos}</p>
            </div>
          )}
          {(fila.nichos.length > 0 || fila.objetivos.length > 0) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {NICHOS.filter((n) => fila.nichos.includes(n.id)).map((n) => (
                <Link key={n.id} href={`/nichos/${n.id}`} className="chip bg-white text-stone-600 ring-1 ring-tierra-200">{n.nombre}</Link>
              ))}
              {OBJETIVOS.filter((o) => fila.objetivos.includes(o.id)).map((o) => (
                <Link key={o.id} href={`/objetivos/${o.id}`} className="chip bg-acopio-100 text-acopio-700">{o.nombre}</Link>
              ))}
            </div>
          )}
          {p.esSuplemento && <AvisoSuplementos />}
        </div>
      </div>

      {combos.filter((c) => c.disponible).length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold text-acopio-900">Combos que lo incluyen</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{combos.filter((c) => c.disponible).map((c) => <TarjetaCombo key={c.slug} c={c} />)}</div>
        </section>
      )}
      {relacionados.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold text-acopio-900">Productos relacionados</h2>
          <GrillaProductos productos={relacionados} />
        </section>
      )}
    </div>
  );
}
