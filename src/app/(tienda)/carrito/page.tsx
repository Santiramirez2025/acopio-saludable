import type { Metadata } from "next";
import { leerConfig } from "@/lib/config";
import { Plazos } from "@/components/Plazos";
import { Titulo } from "@/components/Tienda";
import { VistaCarrito } from "@/components/VistaCarrito";

export const metadata: Metadata = { title: "Carrito", robots: { index: false } };

export default async function CarritoPagina() {
  const cfg = await leerConfig();
  return (
    <div>
      <Titulo sobre="Tu pedido">Carrito</Titulo>
      <VistaCarrito />
      <section className="mt-6 rounded-xl border border-tierra-200 bg-white p-4 lg:max-w-[calc(66.666%-0.5rem)]">
        <h2 className="mb-2 text-sm font-semibold">Cuándo llega</h2>
        <Plazos propia={cfg.entregaPropiaActiva} plazoPropia={cfg.plazoEntregaPropia} className="text-stone-700" />
      </section>
    </div>
  );
}
