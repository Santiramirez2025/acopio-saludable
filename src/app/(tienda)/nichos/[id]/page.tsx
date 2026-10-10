import { Foto } from "@/components/Foto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { leerConfig } from "@/lib/config";
import { NICHOS } from "@/lib/taxonomia";
import { combosTienda, productosTienda } from "@/lib/tienda";
import { GrillaProductos, Titulo } from "@/components/Tienda";
import { PedidoEditable } from "@/components/PedidoEditable";

type Props = { params: Promise<{ id: string }> };

const PORTADAS: Record<string, string> = {
  familias: "/img/portadas/familias.webp",
  hoteleria: "/img/portadas/hoteleria.webp",
  cafeterias: "/img/portadas/hoteleria.webp",
  gimnasios: "/img/portadas/gimnasios.webp",
  kioscos: "/img/portadas/gimnasios.webp",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const n = NICHOS.find((x) => x.id === id);
  return n ? { title: `${n.nombre}: pedido tipo y productos recomendados`, description: `Pedido tipo para ${n.nombre.toLowerCase()}, listo para ajustar y cargar al carrito, y los productos que más se llevan en el rubro. Envíos a todo el país.`, alternates: { canonical: `/nichos/${n.id}` } } : {};
}

export default async function Nicho({ params }: Props) {
  const { id } = await params;
  const nicho = NICHOS.find((x) => x.id === id);
  if (!nicho) notFound();
  const [cfg, pedidos, recomendados, publicados] = await Promise.all([
    leerConfig(),
    combosTienda({ tipo: "PEDIDO_NICHO", nicho: nicho.id, activo: true }),
    productosTienda({ where: { nichos: { has: nicho.id } }, take: 12 }),
    productosTienda({ where: { comboItems: { some: { combo: { tipo: "PEDIDO_NICHO", nicho: nicho.id } } } } }),
  ]);
  const vendibles = new Set(publicados.map((p) => p.codigo));
  return (
    <div className="space-y-12">
      <Titulo sobre="Por negocio" bajada="Productos por volumen para tu negocio, con precios al día y entrega sin cargo en Villa Carlos Paz y sur de Punilla.">
        {nicho.nombre}
      </Titulo>
      {PORTADAS[nicho.id] && <Foto src={PORTADAS[nicho.id]} alt="" className="!mt-0 aspect-[16/10] w-full rounded-3xl sm:aspect-[21/8]" prioridad sizes="(max-width: 1024px) 100vw, 1100px" />}
      {pedidos.map((pedido) => {
        const items = pedido.items.filter((i) => vendibles.has(i.producto.codigo));
        return items.length ? (
          <section key={pedido.slug}>
            <h2 className="font-display text-2xl font-semibold text-acopio-900">Pedido sugerido para {nicho.nombre.toLowerCase()}</h2>
            <p className="mb-3 mt-1 max-w-2xl text-stone-600">Es una lista de ejemplo con lo que más se lleva en el rubro. No es un paquete cerrado: sirve para arrancar y lo ajustás a tu medida.</p>
            <ol className="mb-4 grid gap-2 text-sm sm:grid-cols-3">
              {["Revisá la lista y cambiá las cantidades.", "Cargala al carrito de un toque.", "Pagás online y te lo llevamos."].map((t, i) => (
                <li key={t} className="flex items-center gap-3 rounded-xl bg-white px-3.5 py-3 shadow-ficha"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-acopio-900 text-xs font-bold text-white">{i + 1}</span>{t}</li>
              ))}
            </ol>
            <PedidoEditable items={items} compraMinima={cfg.compraMinima} />
          </section>
        ) : null;
      })}
      {!pedidos.length && (
        <section className="rounded-xl border border-tierra-200 bg-white p-5">
          <p className="font-medium">Todavía no hay un pedido tipo para este rubro.</p>
          <p className="mt-1 text-sm text-stone-600">Contestá 3 preguntas y te armamos uno que llegue a la compra mínima.</p>
          <Link href={`/armador?nicho=${nicho.id}`} className="btn mt-3">Armá tu pedido</Link>
        </section>
      )}
      {recomendados.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold text-acopio-900">Productos recomendados</h2>
            <Link href={`/catalogo?nicho=${nicho.id}`} className="-my-3 flex min-h-[48px] items-center whitespace-nowrap text-sm font-semibold text-acopio-700 underline underline-offset-4">Ver todos</Link>
          </div>
          <GrillaProductos productos={recomendados} />
        </section>
      )}
    </div>
  );
}
