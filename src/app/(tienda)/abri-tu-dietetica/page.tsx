// «Abrí tu dietética» (orden de Santiago, 12/11): el kit para arrancar a fraccionar, con las bolsas cerradas
// de La Granja tal cual vienen, los insumos para fraccionar y lo que ponemos nosotros (lista de precios
// sugerida, reposición semanal, el envío de los jueves). También la opción para almacenes y súper: compran
// por bolsa cerrada o por la escalera mayorista. Los precios salen del catálogo: nunca quedan viejos.
import type { Metadata } from "next";
import Link from "next/link";
import { BotonAgregar } from "@/components/Carrito";
import { combosTienda, productosTienda } from "@/lib/tienda";
import { leerConfig } from "@/lib/config";
import { pesos } from "@/lib/precios";

export const metadata: Metadata = {
  title: "Abrí tu dietética · kit completo para fraccionar · Acopio Saludable",
  description:
    "Todo para arrancar una dietética o sumar fraccionados a tu almacén: 55 kilos de frutos secos, pasas, dátiles y semillas en bolsas cerradas de La Granja, insumos para fraccionar, lista de precios sugerida y reposición semanal. Villa Carlos Paz y Córdoba.",
  alternates: { canonical: "/abri-tu-dietetica" },
};
export const revalidate = 1800;

const WA = (texto: string) => `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMERO || "5493541519630"}?text=${encodeURIComponent(texto)}`;

const INSUMOS = [
  ["Balanza digital de mostrador (hasta 30 kg, precisión 5 g)", "Pesás en el momento, delante del cliente."],
  ["Selladora de bolsas de 30 cm", "Cierre prolijo, el fraccionado queda como de góndola."],
  ["500 bolsas (250 g, 500 g y 1 kg)", "Kraft con ventana o polipropileno transparente."],
  ["500 etiquetas con tu nombre y el peso", "Te las diseñamos nosotros con tu logo."],
  ["Guantes, cucharones y 10 frascos de exhibición", "Para servir, reponer y mostrar."],
] as const;

export default async function AbriTuDietetica() {
  const [cfg, combos, bolsas] = await Promise.all([
    leerConfig(),
    combosTienda({ slug: "abri-tu-dietetica" }),
    productosTienda({ where: { codigo: { in: ["LG-NUEZ-10KG", "LG-CAJU-5KG", "LG-PASAS-10KG", "LG-DATIL-5KG", "LG-MIXSEM-10KG", "LG-MANI-25KG"] } } }),
  ]);
  const kit = combos[0];
  const kilos = bolsas.reduce((s, p) => s + (p.contenido ?? 0) / 1000, 0);
  const recargo = cfg.recargoSugeridoPct;
  const porKilo = (p: (typeof bolsas)[number]) => (p.contenido ? p.precio / (p.contenido / 1000) : 0);

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-acopio-900 p-6 text-white md:p-10">
        <div className="text-sm font-semibold uppercase tracking-widest text-amber-300">Para emprender</div>
        <h1 className="mt-2 text-balance font-display text-3xl font-black leading-tight md:text-5xl">Abrí tu dietética con todo listo para fraccionar</h1>
        <p className="mt-4 max-w-2xl text-white/85">
          Te vendemos lo mismo que compramos nosotros, en las bolsas cerradas de La Granja del Centro, al precio de bolsa. Vos fraccionás y vendés con tu nombre. Nosotros te pasamos la lista de precios sugerida, te diseñamos las etiquetas y te reponemos todas las semanas: el camión llega los jueves.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            [`${kilos} kg`, "de mercadería en bolsas cerradas"],
            [kit ? pesos(Math.round(kit.precio)) : "—", "el kit de mercadería, hoy"],
            ["Jueves", "reposición semanal, sin mínimo"],
          ].map(([a, b]) => (
            <div key={b} className="rounded-2xl bg-white/10 p-4">
              <div className="text-3xl font-black text-amber-300">{a}</div>
              <div className="text-white/80">{b}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {kit?.disponible && <BotonAgregar tipo="combo" id={kit.slug} etiqueta="Quiero el kit de mercadería" conCantidad={false} className="!bg-amber-400 !text-black" />}
          <a href={WA("Hola, quiero abrir una dietética y me interesa el kit completo con los insumos para fraccionar #abri-tu-dietetica")} className="inline-flex min-h-[48px] items-center rounded-full border border-white/40 px-6 font-bold text-white">
            Pedir el kit completo con insumos
          </a>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-black text-acopio-900">1. La mercadería: bolsas cerradas, precio de bolsa</h2>
        <p className="mt-2 max-w-2xl text-stone-700">Cada bolsa viene cerrada de La Granja, con su fecha. No la abrimos ni la fraccionamos: por eso sale más barata que el kilo suelto. Podés llevar el kit entero o elegir bolsas sueltas.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bolsas.map((p) => (
            <article key={p.codigo} className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4">
              <div>
                <div className="font-semibold leading-tight">{p.producto.replace(" · bolsa cerrada", "")}</div>
                <div className="text-sm text-stone-500">{p.presentacion} · bolsa cerrada</div>
                <div className="mt-2 font-display text-2xl font-extrabold tabular-nums">{pesos(p.precio)}</div>
                <div className="text-sm text-stone-600">
                  {pesos(Math.round(porKilo(p) / 100) * 100)} el kilo
                  {recargo > 0 && <> · vendiéndolo a {pesos(Math.round((porKilo(p) * (1 + recargo / 100)) / 100) * 100)} el kilo te queda el {recargo}%</>}
                </div>
              </div>
              <BotonAgregar id={p.codigo} etiqueta="Agregar bolsa" conCantidad={false} className="mt-3" />
            </article>
          ))}
        </div>
        {kit && (
          <div className="mt-4 rounded-2xl bg-acopio-50 p-4 text-sm text-stone-700">
            El kit junta las {bolsas.length} bolsas ({kilos} kilos) por <b>{pesos(Math.round(kit.precio))}</b> ({pesos(Math.round(kit.precioLista))} sueltas). Por transferencia, {cfg.descuentoTransferenciaPct}% menos. ¿Querés cambiar una bolsa por otra (almendra, chía, avena, higos)? Se arma a medida por WhatsApp.
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl font-black text-acopio-900">2. Los insumos para fraccionar</h2>
        <p className="mt-2 max-w-2xl text-stone-700">Lo que usamos nosotros todos los días. Lo sumamos al kit, cotizado al precio del día, para que arranques el mismo jueves que llega la mercadería.</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {INSUMOS.map(([que, para]) => (
            <li key={que} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="font-semibold">{que}</div>
              <div className="text-sm text-stone-600">{para}</div>
            </li>
          ))}
        </ul>
        <a href={WA("Hola, quiero el kit Abrí tu dietética con los insumos para fraccionar. ¿Me pasan el precio de hoy? #abri-tu-dietetica")} className="btn-comprar mt-4 inline-flex">Pedir precio del kit completo</a>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Lista de precios sugerida", `Te pasamos el precio de góndola de cada producto con tu margen (${recargo}% sobre el costo de la bolsa) y la actualizamos cuando cambia la lista de La Granja.`],
          ["Reposición cada jueves", "Pedís hasta el miércoles a la noche y el jueves te lo llevamos. Si es un pedido grande, lo buscamos el mismo día. Sin mínimo en Carlos Paz y la zona."],
          ["Etiquetas y cartel con tu nombre", "Diseñamos las etiquetas y el cartel de precios con tu logo. Vos fraccionás, el cliente ve tu marca."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="font-semibold text-acopio-900">{t}</h3>
            <p className="mt-1 text-sm text-stone-700">{d}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-tierra-100 p-6 md:p-8">
        <h2 className="font-display text-2xl font-black text-acopio-900">¿Tenés un almacén o un súper?</h2>
        <p className="mt-2 max-w-2xl text-stone-700">Sumá la góndola de fraccionados sin cambiar nada: te dejamos las bolsas cerradas al precio de arriba, o te armamos el pedido con la <Link href="/mayorista" className="font-semibold underline">lista mayorista</Link> (−10% desde 5 kg, −15% desde 10 kg, −20% desde 25 kg con reposición semanal). Lo que más se vende en Carlos Paz: nuez, pasas, dátiles, mix de semillas y maní.</p>
        <a href={WA("Hola, tengo un almacén y quiero sumar fraccionados. ¿Me pasan precios por bolsa cerrada? #almacen")} className="btn-comprar mt-4 inline-flex">Pedir precios para mi negocio</a>
      </section>
    </div>
  );
}
