import type { Metadata } from "next";
import { combosTienda } from "@/lib/tienda";
import { TarjetaCombo, Titulo } from "@/components/Tienda";

export const metadata: Metadata = { title: "Combos y promociones", description: "Combos de productos saludables que van bien juntos, con descuento y listos para sumar al pedido. Envíos a todo el país.", alternates: { canonical: "/combos" } };

export default async function Combos() {
  const combos = (await combosTienda({ tipo: "COMBO", activo: true })).filter((c) => c.disponible);
  return (
    <div>
      <Titulo sobre="Combos" bajada="Productos que van bien juntos, listos para sumar al carrito de una.">Combos y promociones</Titulo>
      {combos.length ? (
        <><h2 className="sr-only">Combos disponibles</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{combos.map((c) => <TarjetaCombo key={c.slug} c={c} />)}</div></>
      ) : (
        <p className="text-stone-600">No hay combos disponibles en este momento.</p>
      )}
    </div>
  );
}
