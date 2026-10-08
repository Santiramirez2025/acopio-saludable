import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { leerConfig } from "@/lib/config";
import { NICHOS } from "@/lib/taxonomia";
import { combosTienda, productosTienda } from "@/lib/tienda";
import { GrillaProductos, Titulo } from "@/components/Tienda";
import { PedidoEditable } from "@/components/PedidoEditable";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const n = NICHOS.find((x) => x.id === id);
  return n ? { title: `${n.nombre}: pedido tipo y productos recomendados`, alternates: { canonical: `/nichos/${n.id}` } } : {};
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
      <Titulo sobre="Por negocio" bajada="Un punto de partida pensado para el rubro. Ajustá las cantidades a tu medida y cargalo al carrito de una.">
        {nicho.nombre}
      </Titulo>
      {pedidos.map((pedido) => {
        const items = pedido.items.filter((i) => vendibles.has(i.producto.codigo));
        return items.length ? (
          <section key={pedido.slug}>
            <h2 className="mb-3 font-display text-2xl font-semibold text-acopio-900">{pedido.nombre}</h2>
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
            <Link href={`/catalogo?nicho=${nicho.id}`} className="whitespace-nowrap text-sm text-acopio-700 underline">Ver todos</Link>
          </div>
          <GrillaProductos productos={recomendados} />
        </section>
      )}
    </div>
  );
}
