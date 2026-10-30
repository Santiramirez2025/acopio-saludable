import type { Metadata } from "next";
import Link from "next/link";
import { leerConfig } from "@/lib/config";
import { combosTienda, productosTienda } from "@/lib/tienda";
import { pesos } from "@/lib/precios";
import { urlSitio } from "@/lib/sitio";
import { GRUPOS, MESA_DULCE, presupuestoMesa } from "@/lib/mesa-dulce";
import { EnlaceWhatsapp } from "@/components/Whatsapp";
import { GrillaProductos, TarjetaCombo, Titulo, TituloSeccion } from "@/components/Tienda";

export const metadata: Metadata = {
  title: "Mesa dulce de Navidad: cuánto comprar por persona y cuánto sale",
  description:
    "Cuántos gramos de garrapiñadas, frutos secos, pasas con chocolate y pan dulce calcular por persona para la mesa dulce de Navidad, con el presupuesto armado con nuestros precios de hoy. Entrega en Villa Carlos Paz.",
  alternates: { canonical: "/mesa-dulce-navidad" },
};

export const dynamic = "force-dynamic";

const kilos = (g: number) => (g >= 1000 ? `${(g / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} kg` : `${g} g`);

export default async function MesaDulceNavidad() {
  const cfg = await leerConfig();
  const codigos = MESA_DULCE.map((r) => r.codigo);
  const [productos, combos] = await Promise.all([
    productosTienda({ where: { codigo: { in: codigos } } }),
    combosTienda({ slug: { in: ["mesa-navidena", "regalo-navideno"] } }),
  ]);
  const ordenados = [...productos].sort((a, b) => codigos.indexOf(a.codigo) - codigos.indexOf(b.codigo));
  const renglones = MESA_DULCE.filter((r) => ordenados.some((p) => p.codigo === r.codigo));
  const presupuestos = GRUPOS.map((n) => presupuestoMesa(n, ordenados));
  const mesa = combos.find((c) => c.slug === "mesa-navidena" && c.disponible);
  const otros = combos.filter((c) => c.disponible && c.slug !== "mesa-navidena");
  const gramosPersona = renglones.reduce((s, r) => s + r.gramosPorPersona, 0);
  const minimo = pesos(cfg.compraMinimaPropia);
  const p8 = presupuestos.find((p) => p.personas === 8);
  const hoy = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Cordoba" });

  const preguntas: [string, string][] = [
    ["¿Cuánto calcular por persona para la mesa dulce?", `Nosotros calculamos unos ${gramosPersona} g por persona para una noche: ${renglones.map((r) => `${r.gramosPorPersona} g de ${r.para.replace(/^(una porción fina de|un puñado de|dos o tres) /, "")}`).join(", ")}. Si además hay turrones, budines o helado, se puede bajar. Es una estimación nuestra, no una regla.`],
    ...(p8 ? [["¿Cuánto sale armar una mesa dulce para 8 personas?", `Con nuestros precios de hoy, unos ${pesos(p8.total)} (${pesos(p8.porPersona)} por persona), contando envases enteros. El precio exacto lo ves en el carrito.`] as [string, string]] : []),
    ...(mesa ? [["¿Qué trae el combo Mesa navideña?", `${mesa.items.map((i) => i.producto.producto).join(", ")}. Sale ${pesos(mesa.precio)}.`] as [string, string]] : []),
    ["¿Cuánto antes conviene comprar?", "Los frutos secos y las garrapiñadas en frasco hermético se mantienen bien varias semanas, así que podés comprar a principios de diciembre y evitar las corridas de la última semana."],
    ["¿Hacen entrega en Carlos Paz?", `Sí. La entrega es sin cargo en Villa Carlos Paz, San Antonio de Arredondo, Mayu Sumaj, Icho Cruz y Cuesta Blanca, en ${cfg.plazoEntregaPropia}, con compra mínima de ${minimo}. A Córdoba Capital y al resto del país el envío se paga y se calcula en el carrito.`],
    ["¿Cómo pago?", "Por transferencia, con descuento, o con Mercado Pago. El pedido sale cuando el pago está acreditado."],
  ];

  const base = urlSitio();
  const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: preguntas.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  const migas = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Inicio", item: base }, { "@type": "ListItem", position: 2, name: "Regalos navideños", item: `${base}/regalos-navidenos-cordoba` }, { "@type": "ListItem", position: 3, name: "Mesa dulce de Navidad" }] };
  const lista = { "@context": "https://schema.org", "@type": "ItemList", name: "Mesa dulce de Navidad", itemListElement: ordenados.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}/producto/${encodeURIComponent(p.codigo)}`, name: p.producto })) };

  return (
    <div className="space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faq, migas, lista]).replace(/</g, "\\u003c") }} />
      <div>
        <Titulo sobre="Navidad · Villa Carlos Paz, Córdoba" bajada="Cuánto comprar por persona de garrapiñadas, frutos secos, pasas con chocolate y pan dulce, y cuánto sale con los precios de hoy. Lo pedís por la web o por WhatsApp y te lo llevamos.">
          Mesa dulce de Navidad: cuánto comprar y cuánto sale
        </Titulo>
        <div className="flex flex-wrap items-center gap-3">
          {mesa && <Link href="/combos/mesa-navidena" className="btn-comprar">Ver el combo Mesa navideña</Link>}
          <EnlaceWhatsapp mensaje="Hola, quiero armar la mesa dulce de Navidad para ___ personas" className="btn-sec">Armala por WhatsApp</EnlaceWhatsapp>
        </div>
      </div>

      {renglones.length > 0 && (
        <section>
          <TituloSeccion>Cuánto calcular por persona</TituloSeccion>
          <p className="mb-3 max-w-2xl text-sm text-stone-700">
            Es una estimación nuestra para una noche con varias cosas en la mesa: cada uno prueba un poco de todo. Suma unos {gramosPersona} g por persona. Si hay también turrones, budines o helado, bajalo.
          </p>
          <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {renglones.map((r) => (
              <li key={r.codigo} className="rounded-2xl bg-white p-4 shadow-ficha">
                <p className="font-display text-2xl font-extrabold tabular-nums">{r.gramosPorPersona} g</p>
                <p className="text-sm text-stone-700">{r.para}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {presupuestos.some((p) => p.lineas.length) && (
        <section>
          <TituloSeccion>Cuánto sale, según cuántos son</TituloSeccion>
          <p className="mb-3 text-sm text-stone-600">Con nuestros precios del {hoy}, contando envases enteros. El total exacto lo ves en el carrito.</p>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-ficha">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-tierra-200 text-left">
                  <th className="p-3">Producto</th>
                  {presupuestos.map((p) => <th key={p.personas} className="whitespace-nowrap p-3 text-right">{p.personas} personas</th>)}
                </tr>
              </thead>
              <tbody>
                {renglones.map((r) => {
                  const prod = ordenados.find((p) => p.codigo === r.codigo)!;
                  return (
                    <tr key={r.codigo} className="border-b border-tierra-100">
                      <td className="p-3"><Link href={`/producto/${encodeURIComponent(prod.codigo)}`} className="underline underline-offset-4">{prod.producto}</Link> <span className="text-stone-500">{prod.presentacion}</span></td>
                      {presupuestos.map((p) => {
                        const l = p.lineas.find((x) => x.codigo === r.codigo);
                        return <td key={p.personas} className="whitespace-nowrap p-3 text-right tabular-nums">{l ? <>{l.envases} × <span className="text-stone-500">({kilos(l.gramos)})</span></> : "—"}</td>;
                      })}
                    </tr>
                  );
                })}
                <tr className="font-semibold">
                  <td className="p-3">Total</td>
                  {presupuestos.map((p) => <td key={p.personas} className="p-3 text-right tabular-nums">{pesos(p.total)}</td>)}
                </tr>
                <tr className="text-stone-600">
                  <td className="p-3">Por persona</td>
                  {presupuestos.map((p) => <td key={p.personas} className="p-3 text-right tabular-nums">{pesos(Math.round(p.porPersona))}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-stone-600">En Carlos Paz y la zona la entrega es sin cargo desde {minimo}. Pagando por transferencia sale menos.</p>
        </section>
      )}

      {(mesa || otros.length > 0) && (
        <section>
          <TituloSeccion href="/regalos-navidenos-cordoba" enlace="Regalos navideños">Si preferís resolverlo en un paso</TituloSeccion>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[mesa, ...otros].filter(Boolean).map((c) => <TarjetaCombo key={c!.slug} c={c!} />)}
          </div>
        </section>
      )}

      {ordenados.length > 0 && (
        <section>
          <TituloSeccion href="/catalogo" enlace="Ver el catálogo">Los productos, por separado</TituloSeccion>
          <GrillaProductos productos={ordenados} />
        </section>
      )}

      <section>
        <TituloSeccion>También te puede servir</TituloSeccion>
        <ul className="flex flex-wrap gap-2">
          {[
            ["/regalos-navidenos-cordoba", "Regalos navideños"],
            ["/frutos-secos-carlos-paz", "Frutos secos en Carlos Paz"],
            ["/guias/cuanto-relleno-lleva-el-pan-dulce-casero", "Pan dulce casero: cuánto relleno"],
            ["/guias/como-conservar-frutos-secos", "Cómo conservar frutos secos"],
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
