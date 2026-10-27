import type { Metadata } from "next";
import Link from "next/link";
import { leerConfig } from "@/lib/config";
import { combosTienda, productosTienda } from "@/lib/tienda";
import { pesos } from "@/lib/precios";
import { urlSitio } from "@/lib/sitio";
import { EnlaceWhatsapp } from "@/components/Whatsapp";
import { GrillaProductos, TarjetaCombo, Titulo, TituloSeccion } from "@/components/Tienda";

const CATEGORIA = "Frutos secos y mix";

export const metadata: Metadata = {
  title: "Frutos secos en Villa Carlos Paz por kilo, con entrega a domicilio",
  description:
    "Frutos secos y mixes por kilo en Villa Carlos Paz: nueces, almendras, castañas de cajú, pasas y mix clásico armado en casa. Entrega sin cargo en Carlos Paz y el sur de Punilla.",
  alternates: { canonical: "/frutos-secos-carlos-paz" },
};

export const dynamic = "force-dynamic";

export default async function FrutosSecosCarlosPaz() {
  const cfg = await leerConfig();
  const [productos, combos] = await Promise.all([
    productosTienda({ where: { categoria: CATEGORIA }, orderBy: [{ gancho: "desc" }, { vendidos: "desc" }, { producto: "asc" }], take: 16 }),
    combosTienda({ tipo: "COMBO", activo: true }),
  ]);
  const conFrutos = combos.filter((c) => c.disponible && c.items.some((i) => i.producto.categoria === CATEGORIA)).slice(0, 4);
  const minimo = pesos(cfg.compraMinimaPropia);

  const preguntas: [string, string][] = [
    ["¿Dónde compro frutos secos por kilo en Villa Carlos Paz?", "Acá mismo: somos una dietética online de Villa Carlos Paz. Elegís por la web o por WhatsApp y te llevamos el pedido a tu casa o a tu negocio. No tenemos local a la calle."],
    ["¿Los mixes los arman ustedes?", "Sí. El Mix Clásico y sus variantes (con cajú, con girasol, sin maní, tropical) los armamos en casa con frutos secos que compramos por bolsa grande, y te los mandamos en bolsas de 1 kg, 500 g o 250 g según el producto."],
    ["¿Cobran el envío en Carlos Paz?", `No. La entrega es sin cargo en Villa Carlos Paz, San Antonio de Arredondo, Mayu Sumaj, Icho Cruz y Cuesta Blanca, en ${cfg.plazoEntregaPropia}. A Córdoba Capital y al resto del país el envío se paga y se calcula en el carrito.`],
    ["¿Hay compra mínima?", `Sí, ${minimo} por pedido en la zona de entrega, sumando frutos secos, combos y cualquier otro producto de la tienda.`],
    ["¿Cómo pago?", "Por transferencia, con descuento, o con Mercado Pago. Si preferís, consultanos por WhatsApp y te armamos el pedido."],
    ["¿Sirven para regalar en las fiestas?", "Sí. Los combos de frutos secos y los mixes en bolsa de 1 kg se usan mucho para regalos de fin de año y para la mesa navideña. Si necesitás varias unidades para una empresa, escribinos por WhatsApp."],
  ];

  const base = urlSitio();
  const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: preguntas.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  const migas = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Inicio", item: base }, { "@type": "ListItem", position: 2, name: "Frutos secos en Villa Carlos Paz" }] };
  const lista = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Frutos secos y mixes por kilo",
    itemListElement: productos.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}/producto/${encodeURIComponent(p.codigo)}`, name: p.producto })),
  };

  return (
    <div className="space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faq, migas, lista]).replace(/</g, "\\u003c") }} />
      <div>
        <Titulo sobre="Villa Carlos Paz y Punilla" bajada="Nueces, almendras, castañas de cajú, pasas y mixes armados en casa, en bolsas de 1 kg, 500 g y 250 g. Pedís online o por WhatsApp y te lo llevamos sin cargo dentro de la zona.">
          Frutos secos por kilo en Villa Carlos Paz
        </Titulo>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/catalogo?categoria=${encodeURIComponent(CATEGORIA)}`} className="btn-comprar">Ver todos los frutos secos</Link>
          <EnlaceWhatsapp mensaje="Hola, quiero hacer un pedido de frutos secos en Carlos Paz" className="btn-sec">Pedir por WhatsApp</EnlaceWhatsapp>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Entrega sin cargo", `En Villa Carlos Paz, San Antonio de Arredondo, Mayu Sumaj, Icho Cruz y Cuesta Blanca, en ${cfg.plazoEntregaPropia}.`],
          ["Mixes armados en casa", "Mix Clásico con cajú, con girasol, sin maní y tropical. Sabés lo que lleva cada uno antes de comprar."],
          ["Por kilo, mejor precio", `Comprás en bolsa grande y pagás menos por kilo. Compra mínima de ${minimo}, combinando lo que quieras.`],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl bg-white p-4 shadow-ficha">
            <h2 className="font-display text-lg font-bold">{t}</h2>
            <p className="mt-1 text-sm text-stone-700">{d}</p>
          </div>
        ))}
      </section>

      {productos.length > 0 && (
        <section>
          <TituloSeccion href={`/catalogo?categoria=${encodeURIComponent(CATEGORIA)}`} enlace="Ver todos">Frutos secos y mixes</TituloSeccion>
          <GrillaProductos productos={productos} />
        </section>
      )}

      {conFrutos.length > 0 && (
        <section>
          <TituloSeccion href="/combos" enlace="Todos los combos">Combos con frutos secos</TituloSeccion>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{conFrutos.map((c) => <TarjetaCombo key={c.slug} c={c} />)}</div>
        </section>
      )}

      <section>
        <TituloSeccion>También te puede servir</TituloSeccion>
        <ul className="flex flex-wrap gap-2">
          {[
            ["/dietetica-villa-carlos-paz", "Dietética en Villa Carlos Paz"],
            [`/catalogo?categoria=${encodeURIComponent("Frutas desecadas")}`, "Frutas desecadas"],
            [`/catalogo?categoria=${encodeURIComponent("Semillas y granos")}`, "Semillas y granos"],
            ["/sin-tacc", "Sin TACC"],
            ["/regalos-navidenos-cordoba", "Regalos navideños"],
            ["/combos", "Combos"],
            ["/envios", "Envíos"],
          ].map(([href, t]) => (
            <li key={href}><Link href={href} className="chip min-h-[48px] bg-white px-4 text-sm shadow-ficha">{t}</Link></li>
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
