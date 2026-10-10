import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { wherePublicado } from "@/lib/filtros-producto";
import { combosTienda, productosTienda } from "@/lib/tienda";
import { pesos } from "@/lib/precios";
import { urlSitio } from "@/lib/sitio";
import { RielProductos, TarjetaCombo, Titulo, TituloSeccion } from "@/components/Tienda";

export const metadata: Metadata = {
  title: "Dietética en Villa Carlos Paz con entrega a domicilio",
  description: "Dietética online en Villa Carlos Paz: frutos secos, cereales, harinas, productos sin TACC y suplementos por volumen. Entrega sin cargo en Carlos Paz y sur de Punilla.",
  alternates: { canonical: "/dietetica-villa-carlos-paz" },
};

export default async function DieteticaCarlosPaz() {
  const cfg = await leerConfig();
  const [destacados, combos, conteos] = await Promise.all([
    productosTienda({ orderBy: [{ gancho: "desc" }, { vendidos: "desc" }], take: 8 }),
    combosTienda({ tipo: "COMBO", activo: true }),
    prisma.product.groupBy({ by: ["categoria"], where: wherePublicado(cfg.margenMinimoPct), _count: true, orderBy: { _count: { categoria: "desc" } } }),
  ]);
  const categorias = conteos.filter((c) => c.categoria !== "Sin categoría");
  const preguntas: [string, string][] = [
    ["¿Tienen local a la calle en Villa Carlos Paz?", "No. Somos una dietética online con base en Villa Carlos Paz: pedís por la web y te lo llevamos a tu casa o a tu negocio."],
    ["¿A qué zonas llevan el pedido sin cargo?", `A Villa Carlos Paz y al sur de Punilla: San Antonio de Arredondo, Mayu Sumaj, Icho Cruz y Cuesta Blanca. La entrega es en ${cfg.plazoEntregaPropia}.`],
    ["¿Hacen envíos al resto de Córdoba y del país?", "Sí. Fuera de la zona de entrega propia despachamos por correo a todo el país. El costo se calcula en el carrito con tu código postal."],
    ["¿Cuál es la compra mínima?", `${pesos(cfg.compraMinima)} por pedido, combinando los productos y combos que quieras.`],
    ["¿Cómo se paga?", "Por transferencia bancaria, con descuento, o con tarjeta y dinero en cuenta a través de Mercado Pago."],
    ["¿Tienen productos sin TACC?", "Sí, hay una góndola completa de productos rotulados sin TACC por sus fabricantes. Verificá siempre el logo oficial en el envase."],
  ];
  const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: preguntas.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  const migas = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Inicio", item: urlSitio() }, { "@type": "ListItem", position: 2, name: "Dietética en Villa Carlos Paz" }] };
  return (
    <div className="space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faq, migas]).replace(/</g, "\\u003c") }} />
      <div>
        <Titulo sobre="Villa Carlos Paz y Punilla" bajada="Frutos secos, cereales, harinas, especias, productos sin TACC y suplementos por volumen. Pedís online y te lo llevamos sin cargo a tu casa o a tu negocio.">Dietética en Villa Carlos Paz, con entrega a domicilio</Titulo>
        <div className="flex flex-wrap gap-3">
          <Link href="/catalogo" className="btn-comprar">Ver el catálogo</Link>
          <Link href="/combos" className="btn-sec">Ver combos</Link>
        </div>
      </div>
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Entrega sin cargo", `En Villa Carlos Paz, San Antonio de Arredondo, Mayu Sumaj, Icho Cruz y Cuesta Blanca, en ${cfg.plazoEntregaPropia}.`],
          ["Precio por volumen", `Comprás en cantidad y pagás menos por kilo. Compra mínima de ${pesos(cfg.compraMinima)}, combinando lo que quieras.`],
          ["Para casa o para tu negocio", "Familias, hoteles y cabañas, cafeterías, gimnasios, kioscos y dietéticas de la zona."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl bg-white p-4 shadow-ficha">
            <h2 className="font-display text-lg font-bold">{t}</h2>
            <p className="mt-1 text-sm text-stone-700">{d}</p>
          </div>
        ))}
      </section>
      <section>
        <TituloSeccion href="/catalogo" enlace="Ver todo">Lo que más se pide</TituloSeccion>
        <RielProductos productos={destacados} />
      </section>
      {combos.filter((c) => c.disponible).length > 0 && (
        <section>
          <TituloSeccion href="/combos" enlace="Todos los combos">Combos armados</TituloSeccion>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{combos.filter((c) => c.disponible).slice(0, 4).map((c) => <TarjetaCombo key={c.slug} c={c} />)}</div>
        </section>
      )}
      <section>
        <TituloSeccion>Góndolas</TituloSeccion>
        <ul className="flex flex-wrap gap-2">
          <li><Link href="/sin-tacc" className="chip min-h-[48px] bg-acopio-900 px-4 text-sm text-white">Sin TACC</Link></li>
          {categorias.map((c) => (
            <li key={c.categoria}><Link href={`/catalogo?categoria=${encodeURIComponent(c.categoria)}`} className="chip min-h-[48px] bg-white px-4 text-sm shadow-ficha">{c.categoria}</Link></li>
          ))}
        </ul>
      </section>
      <section>
        <TituloSeccion>Preguntas frecuentes</TituloSeccion>
        <dl className="divide-y divide-tierra-200 rounded-2xl bg-white px-4 shadow-ficha">
          {preguntas.map(([q, a]) => (
            <div key={q} className="py-4">
              <dt className="font-semibold">{q}</dt>
              <dd className="mt-1 text-sm text-stone-700">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
