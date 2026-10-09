import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { aTienda, combosTienda, estaPublicado, productosTienda } from "@/lib/tienda";
import { NICHOS, OBJETIVOS } from "@/lib/taxonomia";
import { pesos, precioPorUnidadBase, precioSugerido } from "@/lib/precios";
import { proximoCorte } from "@/lib/corte";
import { CuentaRegresiva } from "@/components/CuentaRegresiva";
import { Plazos } from "@/components/Plazos";
import { urlSitio } from "@/lib/sitio";
import { Galeria } from "@/components/Galeria";
import { BotonAgregar } from "@/components/Carrito";
import { AvisoSuplementos, RielProductos, TarjetaCombo, TituloSeccion } from "@/components/Tienda";

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
  const cfg = await leerConfig();
  const p = aTienda(fila, cfg.recargoSugeridoPct);
  const reventa = precioSugerido(p.precio, cfg.recargoSugeridoPct);
  const porUnidad = precioPorUnidadBase(p.precio, p.contenido, p.unidad);
  const [combos, relacionados] = await Promise.all([
    combosTienda({ tipo: "COMBO", activo: true, items: { some: { codigo: p.codigo } } }),
    productosTienda({ where: { categoria: p.categoria, codigo: { not: p.codigo } }, take: 8 }),
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
      <nav className="!-mt-3 -mb-3 flex flex-wrap items-center text-sm text-stone-600" aria-label="Ubicación">
        <Link href="/catalogo" className="flex min-h-[48px] items-center underline underline-offset-4">Catálogo</Link>
        <span className="px-1.5">/</span>
        <Link href={`/catalogo?categoria=${encodeURIComponent(p.categoria)}`} className="flex min-h-[48px] items-center underline underline-offset-4">{p.categoria}</Link>
      </nav>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
        <Galeria fotos={fila.fotos.length ? fila.fotos : fila.fotoUrl ? [fila.fotoUrl] : []} alt={`${p.producto} ${p.presentacion}`} etiqueta={p.categoria} />
        <div className="space-y-5">
          <div>
            {p.marca && !/^sin /i.test(p.marca) && <p className="text-sm font-semibold text-acopio-600">{p.marca}</p>}
            <h1 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl">{p.producto}</h1>
            <p className="mt-1.5 text-stone-600">{p.presentacion}</p>
            {p.sinTacc && (
              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-600">
                <Link href="/sin-tacc" className="inline-flex min-h-[48px] items-center"><span className="chip bg-acopio-900 px-3 py-1.5 text-sm text-white">Sin TACC</span></Link>
                Rotulado por el fabricante. Verificá el logo oficial en el envase.
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-ficha">
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
              <p className="font-display text-4xl font-extrabold leading-none tabular-nums">{pesos(p.precio)}</p>
              {porUnidad && <p className="text-right text-sm tabular-nums text-stone-600">{pesos(porUnidad.valor)} {porUnidad.etiqueta}</p>}
            </div>
            {reventa && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-acopio-100 px-3.5 py-2.5 text-sm">
                <span>Venta sugerida <b className="tabular-nums">{pesos(reventa.sugerido)}</b></span>
                <span className="font-semibold text-acopio-700">Ganás <span className="tabular-nums">{pesos(reventa.ganancia)}</span> por unidad</span>
              </div>
            )}
            <BotonAgregar id={p.codigo} etiqueta="Agregar al pedido" className="mt-4" />
            <CuentaRegresiva corte={proximoCorte(new Date(), cfg.corteDias, cfg.corteHora)?.toISOString() ?? null} className="mt-3" />
            <p className="mt-3 text-xs text-stone-600">Compra mínima de {pesos(cfg.compraMinima)} por pedido, combinando los productos que quieras.</p>
            <Plazos propia={cfg.entregaPropiaActiva} plazoPropia={cfg.plazoEntregaPropia} className="mt-3 border-t border-tierra-200 pt-3 text-stone-700" />
          </div>
          {fila.porQueLoElegimos && (
            <div className="rounded-2xl bg-acopio-100 p-4">
              <h2 className="mb-1 text-sm font-semibold text-acopio-700">Por qué lo elegimos</h2>
              <p className="text-sm text-stone-700">{fila.porQueLoElegimos}</p>
            </div>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-stone-600">Presentación</dt><dd>{p.presentacion}</dd>
            <dt className="text-stone-600">Formato</dt><dd>{p.formato}</dd>
            {p.contenido && (<><dt className="text-stone-600">Contenido</dt><dd>{p.contenido} {p.unidad}</dd></>)}
            <dt className="text-stone-600">Código</dt><dd className="tabular-nums">{p.codigo}</dd>
          </dl>
          {(fila.nichos.length > 0 || fila.objetivos.length > 0) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {NICHOS.filter((n) => fila.nichos.includes(n.id)).map((n) => (
                <Link key={n.id} href={`/nichos/${n.id}`} className="inline-flex min-h-[48px] items-center rounded-full bg-white px-4 text-sm font-semibold text-acopio-900 shadow-ficha hover:bg-acopio-900 hover:text-white">{n.nombre}</Link>
              ))}
              {OBJETIVOS.filter((o) => fila.objetivos.includes(o.id)).map((o) => (
                <Link key={o.id} href={`/objetivos/${o.id}`} className="inline-flex min-h-[48px] items-center rounded-full bg-acopio-100 px-4 text-sm font-semibold text-acopio-700 hover:bg-acopio-600 hover:text-white">{o.nombre}</Link>
              ))}
            </div>
          )}
          {p.esSuplemento && <AvisoSuplementos />}
        </div>
      </div>

      {combos.filter((c) => c.disponible).length > 0 && (
        <section>
          <TituloSeccion>Combos que lo incluyen</TituloSeccion>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{combos.filter((c) => c.disponible).map((c) => <TarjetaCombo key={c.slug} c={c} />)}</div>
        </section>
      )}
      {relacionados.length > 0 && (
        <section>
          <TituloSeccion href={`/catalogo?categoria=${encodeURIComponent(p.categoria)}`} enlace="Ver más">También en {p.categoria}</TituloSeccion>
          <RielProductos productos={relacionados} />
        </section>
      )}
    </div>
  );
}
