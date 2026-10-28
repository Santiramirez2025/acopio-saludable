import type { Metadata } from "next";
import Link from "next/link";
import { leerConfig } from "@/lib/config";
import { combosTienda, productosTienda } from "@/lib/tienda";
import { AVISO_SIN_TACC, WHERE_SIN_TACC } from "@/lib/filtros-producto";
import { pesos } from "@/lib/precios";
import { urlSitio } from "@/lib/sitio";
import { EnlaceWhatsapp } from "@/components/Whatsapp";
import { GrillaProductos, TarjetaCombo, Titulo, TituloSeccion } from "@/components/Tienda";

export const metadata: Metadata = {
  title: "Productos sin TACC en Villa Carlos Paz (Córdoba, Argentina) con entrega a domicilio",
  description:
    "Dietética online de Villa Carlos Paz, Córdoba, Argentina: alfajores, galletitas, pan rallado y snacks rotulados sin TACC. Entrega sin cargo en Carlos Paz y el sur de Punilla.",
  alternates: { canonical: "/sin-tacc-carlos-paz" },
};

export const dynamic = "force-dynamic";

export default async function SinTaccCarlosPaz() {
  const cfg = await leerConfig();
  const [productos, combos] = await Promise.all([
    productosTienda({ where: WHERE_SIN_TACC, orderBy: [{ gancho: "desc" }, { vendidos: "desc" }, { producto: "asc" }], take: 24 }),
    combosTienda({ tipo: "COMBO", activo: true }),
  ]);
  // Solo combos en los que todos los productos vienen rotulados sin TACC.
  const combosSinTacc = combos.filter((c) => c.disponible && c.items.every((i) => i.producto.sinTacc)).slice(0, 4);
  const minimo = pesos(cfg.compraMinimaPropia);

  const preguntas: [string, string][] = [
    ["¿Dónde compro productos sin TACC en Villa Carlos Paz?", "Acá mismo: somos una dietética online de Villa Carlos Paz, Córdoba, Argentina. Elegís por la web o por WhatsApp y te llevamos el pedido a tu casa. No tenemos local a la calle."],
    ["¿Cómo sé que un producto es sin TACC?", `Marcamos como sin TACC solo lo que el fabricante rotula sin TACC o sin gluten. ${AVISO_SIN_TACC}`],
    ["¿Los frutos secos y los mixes sueltos son sin TACC?", "No los marcamos así. Los frutos secos y los mixes que fraccionamos en casa no llevan rótulo sin TACC, así que si sos celíaco elegí los productos envasados con el logo."],
    ["¿Cobran el envío en Carlos Paz?", `No. La entrega es sin cargo en Villa Carlos Paz, San Antonio de Arredondo, Mayu Sumaj, Icho Cruz y Cuesta Blanca, en ${cfg.plazoEntregaPropia}. A Córdoba Capital y al resto del país el envío se paga y se calcula en el carrito.`],
    ["¿Hay compra mínima?", `Sí, ${minimo} por pedido en la zona de entrega, sumando productos sin TACC con cualquier otro producto de la tienda.`],
    ["¿Cómo pago?", "Por transferencia, con descuento, o con Mercado Pago. Si preferís, escribinos por WhatsApp y te armamos el pedido."],
  ];

  const base = urlSitio();
  const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: preguntas.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  const migas = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Inicio", item: base }, { "@type": "ListItem", position: 2, name: "Sin TACC en Villa Carlos Paz" }] };
  const lista = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Productos sin TACC",
    itemListElement: productos.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}/producto/${encodeURIComponent(p.codigo)}`, name: p.producto })),
  };

  return (
    <div className="space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faq, migas, lista]).replace(/</g, "\\u003c") }} />
      <div>
        <Titulo sobre="Villa Carlos Paz, Córdoba, Argentina" bajada="Alfajores, galletitas, pan rallado, tapas de alfajor y snacks rotulados sin TACC por su fabricante. Pedís online o por WhatsApp y te lo llevamos sin cargo dentro de la zona.">
          Productos sin TACC en Villa Carlos Paz
        </Titulo>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/sin-tacc" className="btn-comprar">Ver todos los sin TACC</Link>
          <EnlaceWhatsapp mensaje="Hola, quiero hacer un pedido de productos sin TACC en Carlos Paz" className="btn-sec">Pedir por WhatsApp</EnlaceWhatsapp>
        </div>
        <p className="mt-3 text-sm text-stone-600">{AVISO_SIN_TACC}</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Entrega sin cargo", `En Villa Carlos Paz, San Antonio de Arredondo, Mayu Sumaj, Icho Cruz y Cuesta Blanca, en ${cfg.plazoEntregaPropia}.`],
          ["Solo rotulados", "En esta sección van únicamente productos envasados con rótulo sin TACC o sin gluten del fabricante."],
          ["Combinás con todo", `Compra mínima de ${minimo}, sumando sin TACC con frutos secos, semillas y el resto de la tienda.`],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl bg-white p-4 shadow-ficha">
            <h2 className="font-display text-lg font-bold">{t}</h2>
            <p className="mt-1 text-sm text-stone-700">{d}</p>
          </div>
        ))}
      </section>

      {productos.length > 0 && (
        <section>
          <TituloSeccion href="/sin-tacc" enlace="Ver todos">Productos sin TACC</TituloSeccion>
          <GrillaProductos productos={productos} />
        </section>
      )}

      {combosSinTacc.length > 0 && (
        <section>
          <TituloSeccion href="/combos" enlace="Todos los combos">Combos sin TACC</TituloSeccion>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{combosSinTacc.map((c) => <TarjetaCombo key={c.slug} c={c} />)}</div>
        </section>
      )}

      <section>
        <TituloSeccion>También te puede servir</TituloSeccion>
        <ul className="flex flex-wrap gap-2">
          {[
            ["/dietetica-villa-carlos-paz", "Dietética en Villa Carlos Paz"],
            ["/frutos-secos-carlos-paz", "Frutos secos en Carlos Paz"],
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
