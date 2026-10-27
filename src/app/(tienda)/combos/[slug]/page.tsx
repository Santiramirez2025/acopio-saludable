import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { combosTienda } from "@/lib/tienda";
import { leerConfig } from "@/lib/config";
import { medida, pesos, renglonCombo } from "@/lib/precios";
import { urlSitio } from "@/lib/sitio";
import { BotonAgregar } from "@/components/Carrito";
import { BotonCompartir } from "@/components/Compartir";
import { Foto } from "@/components/Foto";
import { Medir } from "@/components/Medicion";
import { AvisoSuplementos, Titulo } from "@/components/Tienda";

type Props = { params: Promise<{ slug: string }> };

async function cargar(slug: string) {
  const [c] = await combosTienda({ slug, tipo: "COMBO" });
  return c?.disponible ? c : null;
}

// Combos con una segunda imagen de ambiente en public/img/combos/<slug>-2.webp.
const SEGUNDA_FOTO = new Set<string>([]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await cargar((await params).slug);
  return c ? { title: `Combo ${c.nombre}`, description: `Combo ${c.nombre}: ${c.items.map((i) => i.producto.producto).join(", ")}. Envíos a todo el país.`.slice(0, 155), alternates: { canonical: `/combos/${c.slug}` } } : { title: "Combo no disponible" };
}

export default async function ComboPagina({ params }: Props) {
  const c = await cargar((await params).slug);
  if (!c) notFound();
  const cfg = await leerConfig();
  const faltaParaMinimo = Math.max(0, cfg.compraMinima - c.precio);
  const unidades = c.items.reduce((s, i) => s + i.cantidad, 0);
  // Peso total: solo si todos los productos se venden por peso, para no mezclar gramos con mililitros.
  const gramos = c.items.every((i) => i.producto.unidad === "g" && i.producto.contenido)
    ? c.items.reduce((s, i) => s + (i.producto.contenido ?? 0) * i.cantidad, 0)
    : 0;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `Combo ${c.nombre}`,
    sku: `combo-${c.slug}`,
    image: c.fotoUrl ? `${urlSitio()}${c.fotoUrl}` : undefined,
    description: c.items.map((i) => `${i.cantidad} × ${i.producto.producto}`).join(", "),
    offers: { "@type": "Offer", price: c.precio.toFixed(2), priceCurrency: "ARS", availability: "https://schema.org/InStock", url: `${urlSitio()}/combos/${c.slug}` },
  };
  return (
    <div className="space-y-6">
      <Medir evento="ver_producto" ids={[`combo-${c.slug}`]} valor={c.precio} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/combos" className="-my-3 inline-flex min-h-[48px] items-center text-sm text-stone-600 underline underline-offset-4">← Combos</Link>
      <Titulo sobre="Combo">{c.nombre}</Titulo>
      <p className="-mt-3 text-[15px] leading-relaxed text-stone-700">
        <b className="font-semibold text-acopio-900">Trae {unidades} productos{gramos ? `, ${medida(gramos, "g")} en total` : ""}:</b>{" "}
        {c.items.map(({ producto, cantidad }) => renglonCombo(producto, cantidad)).join(" · ")}.
      </p>
      {c.fotoUrl && (
        <div className={`grid gap-3 ${SEGUNDA_FOTO.has(c.slug) ? "sm:grid-cols-2" : ""}`}>
          <Foto src={c.fotoUrl} alt={`Combo ${c.nombre}`} className={`w-full rounded-3xl ${SEGUNDA_FOTO.has(c.slug) || c.fotoUrl.includes("/v2/") ? "aspect-[4/3] sm:max-w-2xl" : "aspect-[16/10] sm:aspect-[21/9]"}`} prioridad sizes="(max-width: 640px) 100vw, 550px" />
          {SEGUNDA_FOTO.has(c.slug) && <Foto src={`/img/combos/${c.slug}-2.webp`} alt="" className="aspect-[4/3] w-full rounded-3xl" sizes="(max-width: 640px) 100vw, 550px" />}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
        <h2 className="mb-2 font-display text-lg font-bold">Qué trae el combo</h2>
        <ul className="divide-y divide-tierra-100 rounded-xl border border-tierra-200 bg-white">
          {c.items.map(({ producto: p, cantidad }) => (
            <li key={p.codigo} className="flex items-center gap-3 p-3">
              <Foto src={p.fotoUrl} alt="" etiqueta=" " className="h-16 w-16 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <Link href={`/producto/${encodeURIComponent(p.codigo)}`} className="flex min-h-[48px] items-center text-sm font-medium hover:underline">
                  {cantidad > 1 && <span className="mr-1.5 shrink-0 rounded-md bg-acopio-100 px-1.5 py-0.5 text-xs font-bold tabular-nums text-acopio-700">{cantidad}×</span>}
                  {p.producto}
                </Link>
                <p className="text-xs text-stone-600">{medida(p.contenido, p.unidad) ?? p.presentacion}{p.marca.startsWith("Sin marca") ? "" : ` · ${p.marca}`}</p>
              </div>
              <span className="shrink-0 text-sm tabular-nums text-stone-600">{pesos(p.precio * cantidad)}</span>
            </li>
          ))}
        </ul>
        </div>
        {/* En el celular el precio y «Agregar combo» van antes de la lista: si no, quedan abajo del pliegue. */}
        <div className="order-first h-fit space-y-3 rounded-xl border border-tierra-200 bg-white p-5 lg:order-none">
          {c.ahorro > 0 && <p className="text-sm tabular-nums text-stone-600 line-through">{pesos(c.precioLista)}</p>}
          <p className="text-3xl font-semibold tabular-nums">{pesos(c.precio)}</p>
          {c.ahorro > 0 && <p className="text-sm text-acopio-700">Ahorrás {pesos(c.ahorro)} ({c.descuentoPct}%)</p>}
          <BotonAgregar tipo="combo" id={c.slug} etiqueta="Agregar combo" />
          {faltaParaMinimo > 0 && (
            <p className="text-xs text-stone-600">
              La compra mínima es {pesos(cfg.compraMinima)}{c.precio >= cfg.compraMinimaPropia && cfg.compraMinimaPropia < cfg.compraMinima ? " (en Villa Carlos Paz y el sur de Punilla ya llega: ahí el mínimo es " + pesos(cfg.compraMinimaPropia) + ")" : ""}. Sumá {pesos(faltaParaMinimo)} más y ya podés comprar: <Link href="/catalogo" className="font-semibold text-acopio-700 underline underline-offset-2">elegí del catálogo</Link> o <Link href="/combos" className="font-semibold text-acopio-700 underline underline-offset-2">mirá otro combo</Link>.
            </p>
          )}
          <BotonCompartir etiqueta="Compartir combo" texto={`Mirá el combo ${c.nombre} de Acopio Saludable:`} ruta={`/combos/${c.slug}`} className="btn-sec w-full" />
          {c.items.some((i) => i.producto.esSuplemento) && <AvisoSuplementos />}
        </div>
      </div>
    </div>
  );
}
