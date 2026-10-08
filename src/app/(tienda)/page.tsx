import Link from "next/link";
import { leerConfig } from "@/lib/config";
import { combosTienda, productosTienda } from "@/lib/tienda";
import { NICHOS, OBJETIVOS } from "@/lib/taxonomia";
import { pesos } from "@/lib/precios";
import { GrillaProductos, TarjetaCombo } from "@/components/Tienda";

export default async function Home() {
  const [cfg, ganchos, combos] = await Promise.all([
    leerConfig(),
    productosTienda({ where: { gancho: true }, take: 8 }),
    combosTienda({ tipo: "COMBO", activo: true }),
  ]);
  const disponibles = combos.filter((c) => c.disponible);
  const destacados = disponibles.filter((c) => c.destacado).slice(0, 4);
  const promos = disponibles.filter((c) => c.descuentoPct > 0);

  return (
    <div className="space-y-14">
      <section className="grid items-center gap-8 rounded-2xl bg-acopio-700 px-6 py-10 text-white sm:px-10 sm:py-14 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-acopio-100">Villa Carlos Paz · Envíos a todo el país</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">Productos saludables por volumen, para tu negocio o tu casa.</h1>
          <p className="mt-4 max-w-xl text-acopio-100">
            Una selección curada de dietética, frutos secos, suplementos, snacks y especias, respaldada por un proveedor con más de 10 años en el rubro.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/armador" className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-acopio-700 hover:bg-acopio-50">Armá tu pedido en 3 pasos</Link>
            <Link href="/catalogo" className="rounded-md border border-white/40 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">Ver catálogo</Link>
          </div>
        </div>
        <ol className="space-y-3 rounded-xl bg-white/10 p-5 text-sm lg:col-span-2">
          <li className="font-display text-lg font-semibold">Cómo funciona</li>
          <li><span className="font-semibold">1. Elegí.</span> Por tipo de negocio, por objetivo o desde el catálogo completo.</li>
          <li><span className="font-semibold">2. Llegá a la compra mínima de {pesos(cfg.compraMinima)}.</span> El carrito te muestra cuánto te falta.</li>
          <li><span className="font-semibold">3. Preparamos tu pedido y lo enviamos.</span> Compramos contra pedido: lo tuyo sale fresco del proveedor.</li>
        </ol>
      </section>

      {ganchos.length > 0 && (
        <section>
          <Encabezado titulo="Los que más se llevan" href="/catalogo" enlace="Ver todo el catálogo" />
          <GrillaProductos productos={ganchos} />
        </section>
      )}

      {promos.length > 0 && (
        <section>
          <Encabezado titulo="Promociones vigentes" href="/combos" enlace="Ver todos los combos" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{promos.slice(0, 4).map((c) => <TarjetaCombo key={c.slug} c={c} />)}</div>
        </section>
      )}

      {destacados.length > 0 && (
        <section>
          <Encabezado titulo="Combos destacados" href="/combos" enlace="Ver todos los combos" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{destacados.map((c) => <TarjetaCombo key={c.slug} c={c} />)}</div>
        </section>
      )}

      <section>
        <Encabezado titulo="Comprá por tipo de negocio" href="/nichos" enlace="Ver todos" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {NICHOS.map((n) => (
            <Link key={n.id} href={`/nichos/${n.id}`} className="rounded-xl border border-tierra-200 bg-white p-4 font-medium hover:border-acopio-500">
              {n.nombre}
              <span className="mt-1 block text-xs font-normal text-stone-500">Pedido tipo y recomendados</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <Encabezado titulo="Comprá por objetivo de bienestar" href="/objetivos" enlace="Explorar objetivos" />
        <div className="flex flex-wrap gap-2">
          {OBJETIVOS.map((o) => (
            <Link key={o.id} href={`/objetivos/${o.id}`} className="rounded-full border border-tierra-200 bg-white px-4 py-2 text-sm font-medium hover:border-acopio-500">{o.nombre}</Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Encabezado({ titulo, href, enlace }: { titulo: string; href: string; enlace: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-2xl font-semibold text-acopio-900">{titulo}</h2>
      <Link href={href} className="whitespace-nowrap text-sm text-acopio-700 underline">{enlace}</Link>
    </div>
  );
}
