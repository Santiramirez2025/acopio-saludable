// Lista mayorista para negocios (dietéticas, almacenes, kioscos, gimnasios, cafés, cabañas): la que manda Leo.
// Precios de hoy con la escalera mayorista (−10% desde 5 kg, −15% desde 10 kg, −20% desde 25 kg con
// reposición semanal), con foto de cada producto. Se arma sola desde el catálogo: nunca queda vieja.
import type { Metadata } from "next";
import { productosTienda } from "@/lib/tienda";
import { pesos } from "@/lib/precios";
import { prisma } from "@/lib/prisma";
import { precioMayorista } from "@/lib/mayorista-precios";

export const metadata: Metadata = {
  title: "Lista mayorista para negocios · Acopio Saludable",
  description: "Frutos secos, mixes propios, frutas desecadas, semillas, cereales, harinas y especias por kilo para dietéticas, almacenes, kioscos y gimnasios de Carlos Paz, Punilla y Córdoba. Hasta 20% menos por volumen.",
  alternates: { canonical: "/mayorista" },
  openGraph: { images: ["/img/mayorista-og.png"] },
};
export const revalidate = 3600;

const CATEGORIAS = ["Frutos secos y mix", "Frutas desecadas", "Semillas y granos", "Cereales y granolas", "Harinas y Féculas", "Legumbres", "Especias", "Repostería"];
const WA = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMERO || "5493541519630"}?text=${encodeURIComponent("Hola, tengo un negocio y quiero comprar por mayor #mayorista")}`;

export default async function Mayorista() {
  const ps = (await productosTienda({ where: { categoria: { in: CATEGORIAS } } })).filter((p) => p.fotoUrl && p.precio > 0);
  // El costo se lee acá (servidor) solo para no vender debajo del piso; nunca llega a la página.
  const filas: { codigo: string; costo: unknown }[] = await prisma.product.findMany({ where: { codigo: { in: ps.map((p) => p.codigo) } }, select: { codigo: true, costo: true } });
  const costos = new Map<string, number>(filas.map((c) => [c.codigo, Number(c.costo)]));
  const grupos = CATEGORIAS.map((c) => ({ c, ps: ps.filter((p) => p.categoria === c) })).filter((g) => g.ps.length);
  return (
    <div>
      <section className="rounded-3xl bg-acopio-900 p-6 text-white md:p-10">
        <div className="text-sm font-semibold uppercase tracking-widest text-amber-300">Para negocios</div>
        <h1 className="mt-2 text-3xl font-black md:text-5xl">Lista mayorista de hoy</h1>
        <p className="mt-3 max-w-2xl text-white/80">Mixes propios armados en el día y productos de La Granja del Centro, fraccionados en Carlos Paz. Precio por volumen sobre el total del pedido (cada producto muestra su precio final):</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[["−10%", "desde 5 kg"], ["−15%", "desde 10 kg"], ["−20%", "desde 25 kg con reposición semanal"]].map(([a, b]) => (
            <div key={a} className="rounded-2xl bg-white/10 p-4"><div className="text-3xl font-black text-amber-300">{a}</div><div className="text-white/80">{b}</div></div>
          ))}
        </div>
        <p className="mt-4 text-sm text-white/70">Pedido mínimo mayorista $60.000. Se paga antes de entregar (transferencia o Mercado Pago). Entrega sin cargo en Carlos Paz y la zona; Córdoba Capital $15.000 o sin cargo desde $150.000. Te sugerimos el precio de góndola para que sepas cuánto ganás.</p>
        <a href={WA} className="mt-5 inline-block rounded-full bg-amber-400 px-6 py-3 font-bold text-black">Pedir por WhatsApp</a>
      </section>
      {grupos.map((g) => (
        <section key={g.c} className="mt-8">
          <h2 className="text-xl font-black text-acopio-900">{g.c}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {g.ps.map((p) => (
              <article key={p.codigo} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.fotoUrl!} alt={`${p.producto} ${p.presentacion}`} className="aspect-square w-full object-cover" loading="lazy" />
                <div className="p-3">
                  <div className="font-semibold leading-tight">{p.producto}</div>
                  <div className="text-sm text-stone-500">{p.presentacion}</div>
                  <div className="mt-2 text-sm">Góndola sugerida: <b>{pesos(p.precio)}</b></div>
                  {(() => {
                    const costo = costos.get(p.codigo) ?? 0;
                    const a = precioMayorista(p.precio, costo, p.producto, 10);
                    const b = precioMayorista(p.precio, costo, p.producto, 15);
                    if (!a.pct) return <div className="text-sm text-stone-500">Precio de lista (no entra en la escalera)</div>;
                    if (b.precio === a.precio) return <div className="text-sm text-acopio-900">Por volumen: <b>{pesos(a.precio)}</b> <span className="text-stone-500">(−{a.pct}%{a.pct === 10 ? " fijo" : ""})</span></div>;
                    return (
                      <>
                        <div className="text-sm text-acopio-900">Desde 5 kg: <b>{pesos(a.precio)}</b></div>
                        <div className="text-sm text-acopio-900">Desde 10 kg: <b>{pesos(b.precio)}</b>{b.pct < 15 ? <span className="text-stone-500"> (−{b.pct}%)</span> : null}</div>
                      </>
                    );
                  })()}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
