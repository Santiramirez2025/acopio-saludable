import type { Metadata } from "next";
import Link from "next/link";
import { leerConfig } from "@/lib/config";
import { combosTienda, productosTienda, type ComboTienda } from "@/lib/tienda";
import { pesos } from "@/lib/precios";
import { urlSitio } from "@/lib/sitio";
import { EnlaceWhatsapp } from "@/components/Whatsapp";
import { GrillaProductos, TarjetaCombo, Titulo, TituloSeccion } from "@/components/Tienda";

// Combos de temporada, en este orden. Si uno no existe o no está disponible, no se muestra.
const COMBOS_NAVIDAD = ["regalo-navideno", "mesa-navidena", "pan-dulce-casero", "alacena-de-frutos-secos", "mix-caju-banana"];
// Lo que más se usa para regalar y para la mesa de fin de año.
const PRODUCTOS_NAVIDAD = ["TG-NUEZ", "LG-ALMNP-500", "TG-CAJU", "LG-DATIL", "TG-PASAS", "TG-MIXC", "TG-MIXTSM", "TG-CAJUPASAS"];

export const metadata: Metadata = {
  title: "Regalos navideños en Córdoba: frutos secos, kit pan dulce y regalos para empresas",
  description:
    "Regalos de Navidad con frutos secos en Córdoba y Carlos Paz: bolsa regalo navideña, kit pan dulce casero y combos para la mesa. Pedidos para empresas por WhatsApp.",
  alternates: { canonical: "/regalos-navidenos-cordoba" },
};

export const dynamic = "force-dynamic";

function queTrae(c: ComboTienda | undefined): string | null {
  if (!c) return null;
  return c.items.map((i) => i.producto.producto).join(", ");
}

export default async function RegalosNavidenosCordoba() {
  const cfg = await leerConfig();
  const [todos, productos] = await Promise.all([
    combosTienda({ slug: { in: COMBOS_NAVIDAD } }),
    productosTienda({ where: { codigo: { in: PRODUCTOS_NAVIDAD } } }),
  ]);
  const combos = todos.filter((c) => c.disponible).sort((a, b) => COMBOS_NAVIDAD.indexOf(a.slug) - COMBOS_NAVIDAD.indexOf(b.slug));
  const ordenados = [...productos].sort((a, b) => PRODUCTOS_NAVIDAD.indexOf(a.codigo) - PRODUCTOS_NAVIDAD.indexOf(b.codigo));
  const minimo = pesos(cfg.compraMinimaPropia);
  const bolsa = combos.find((c) => c.slug === "regalo-navideno");
  const kit = combos.find((c) => c.slug === "pan-dulce-casero");

  const preguntas: [string, string][] = [
    [
      "¿Hacen regalos navideños para empresas en Córdoba?",
      "Sí. Escribinos por WhatsApp con cuántos regalos necesitás, el presupuesto por persona y la fecha en que los querés tener. Te armamos una propuesta con los combos de la tienda o con una bolsa a medida y te pasamos el total.",
    ],
    ...(bolsa ? [["¿Qué trae la Bolsa regalo navideña?", `${queTrae(bolsa)}. Sale ${pesos(bolsa.precio)}${bolsa.ahorro > 0 ? `, ${pesos(bolsa.ahorro)} menos que comprando cada producto por separado` : ""}.`] as [string, string]] : []),
    ...(kit ? [["¿Qué trae el Kit Pan Dulce casero?", `${queTrae(kit)}: lo que va adentro del pan dulce o del budín, en una sola bolsa. Sale ${pesos(kit.precio)}.`] as [string, string]] : []),
    [
      "¿Cobran el envío?",
      `En Villa Carlos Paz, San Antonio de Arredondo, Mayu Sumaj, Icho Cruz y Cuesta Blanca la entrega es sin cargo, en ${cfg.plazoEntregaPropia}. A Córdoba Capital y al resto del país el envío se paga y se calcula en el carrito.`,
    ],
    ["¿Hay compra mínima?", `Sí, ${minimo} por pedido en la zona de entrega, sumando combos y cualquier otro producto de la tienda.`],
    ["¿Puedo armar mi propio regalo?", "Sí. Elegí los frutos secos y las frutas desecadas que quieras en el catálogo, o usá el armador de pedidos. Si es para regalar, avisanos por WhatsApp y lo separamos por persona."],
    ["¿Cómo pago?", "Por transferencia, con descuento, o con Mercado Pago."],
  ];

  const base = urlSitio();
  const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: preguntas.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  const migas = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Inicio", item: base }, { "@type": "ListItem", position: 2, name: "Regalos navideños en Córdoba" }] };
  const lista = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Combos y regalos de Navidad",
    itemListElement: combos.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}/combos/${encodeURIComponent(c.slug)}`, name: c.nombre })),
  };

  return (
    <div className="space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faq, migas, lista]).replace(/</g, "\\u003c") }} />
      <div>
        <Titulo sobre="Córdoba, Carlos Paz y Punilla" bajada="Bolsas de frutos secos para regalar, el kit para tu pan dulce casero y combos para la mesa de fin de año. Para tu familia o para todo tu equipo: pedís online o por WhatsApp.">
          Regalos navideños con frutos secos
        </Titulo>
        <div className="flex flex-wrap items-center gap-3">
          <a href="#combos" className="btn-comprar">Ver los regalos</a>
          <EnlaceWhatsapp mensaje="Hola, quiero consultar por regalos navideños para mi empresa" className="btn-sec">Regalos para empresas</EnlaceWhatsapp>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Para regalar", "Frutos secos, dátiles y nuestros mixes armados en casa, en bolsas de 500 g y 1 kg. Un regalo rico que se usa."],
          ["Para empresas", "Decinos cuántos regalos, presupuesto por persona y fecha. Te pasamos una propuesta por WhatsApp."],
          ["Entrega en la zona", `Sin cargo en Carlos Paz y el sur de Punilla, en ${cfg.plazoEntregaPropia}. A Córdoba Capital, con envío pago.`],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl bg-white p-4 shadow-ficha">
            <h2 className="font-display text-lg font-bold">{t}</h2>
            <p className="mt-1 text-sm text-stone-700">{d}</p>
          </div>
        ))}
      </section>

      {combos.length > 0 && (
        <section id="combos" className="scroll-mt-24">
          <TituloSeccion href="/combos" enlace="Todos los combos">Combos para regalar y para la mesa</TituloSeccion>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{combos.map((c) => <TarjetaCombo key={c.slug} c={c} />)}</div>
        </section>
      )}

      {ordenados.length > 0 && (
        <section>
          <TituloSeccion href={`/catalogo?categoria=${encodeURIComponent("Frutos secos y mix")}`} enlace="Ver todos">Lo que más va en la mesa navideña</TituloSeccion>
          <GrillaProductos productos={ordenados} />
        </section>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-ficha">
        <h2 className="font-display text-xl font-bold">Regalos para empresas en Córdoba</h2>
        <p className="mt-2 text-sm text-stone-700">
          Para fin de año armamos regalos para equipos, clientes y proveedores. Mandanos por WhatsApp tres datos: cuántos regalos, cuánto querés gastar por persona y para qué fecha los necesitás. Con eso te proponemos combos de la tienda o una bolsa a medida y te pasamos el total.
        </p>
        <div className="mt-4">
          <EnlaceWhatsapp mensaje="Hola, quiero regalos navideños para mi empresa. Cantidad: ___ · Presupuesto por persona: ___ · Fecha: ___" className="btn-comprar">Pedir propuesta por WhatsApp</EnlaceWhatsapp>
        </div>
      </section>

      <section>
        <TituloSeccion>También te puede servir</TituloSeccion>
        <ul className="flex flex-wrap gap-2">
          {[
            ["/mesa-dulce-navidad", "Mesa dulce: cuánto comprar"],
            ["/frutos-secos-carlos-paz", "Frutos secos por kilo"],
            ["/combos", "Combos"],
            ["/armador", "Armá tu pedido"],
            ["/sin-tacc-carlos-paz", "Sin TACC en Carlos Paz"],
            ["/dietetica-villa-carlos-paz", "Dietética en Villa Carlos Paz"],
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
