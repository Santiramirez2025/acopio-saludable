import type { Metadata } from "next";
import { zonaPagaDe } from "@/lib/envios/tabla";
import { leerConfig } from "@/lib/config";
import { CompartirCarrito, PedidoCompartido } from "@/components/Compartir";
import { Plazos } from "@/components/Plazos";
import { costoEntregaZona } from "@/lib/minimo-zona";
import { Titulo } from "@/components/Tienda";
import { VistaCarrito } from "@/components/VistaCarrito";
import { SugeridosCarrito } from "@/components/SugeridosCarrito";
import { combosTienda, productosTienda } from "@/lib/tienda";
import { armarSugeridos, SUGERIDOS_CARRITO } from "@/lib/sugeridos-carrito";

export const metadata: Metadata = { title: "Carrito", robots: { index: false } };

export default async function CarritoPagina() {
  const cfg = await leerConfig();
  const codigos = SUGERIDOS_CARRITO.filter((s) => s.tipo === "producto").map((s) => s.id as string);
  const slugs = SUGERIDOS_CARRITO.filter((s) => s.tipo === "combo").map((s) => s.id as string);
  const [productos, combos] = await Promise.all([
    productosTienda({ where: { codigo: { in: codigos } } }).catch(() => []),
    combosTienda({ slug: { in: slugs }, activo: true }).catch(() => []),
  ]);
  const sugeridos = armarSugeridos(productos, combos);
  return (
    <div>
      <Titulo sobre="Tu pedido">Carrito</Titulo>
      <PedidoCompartido />
      <VistaCarrito whatsapp={cfg.whatsapp} />
      <div className="lg:max-w-[calc(66.666%-0.5rem)]"><SugeridosCarrito items={sugeridos} /></div>
      <div className="mt-3 lg:max-w-[calc(66.666%-0.5rem)]"><CompartirCarrito /></div>
      <section className="mt-6 rounded-xl border border-tierra-200 bg-white p-4 lg:max-w-[calc(66.666%-0.5rem)]">
        <h2 className="mb-2 text-sm font-semibold">Cuándo llega</h2>
        <Plazos propia={cfg.entregaPropiaActiva} plazoPropia={cfg.plazoEntregaPropia} costoZona={costoEntregaZona(cfg)} zonaPaga={zonaPagaDe(cfg.tabla)} className="text-stone-700" />
      </section>
    </div>
  );
}
