import type { Metadata } from "next";
import Link from "next/link";
import { ofertasDelProveedor } from "@/lib/ofertas";
import { DIAS_DE_OFERTA } from "@/lib/precios";
import { TarjetaProducto, Titulo } from "@/components/Tienda";

export const metadata: Metadata = {
  title: "Bajaron de precio",
  description: "Productos que el proveedor bajó en su última lista: frutos secos, cereales, sin TACC y despensa por volumen, con el precio de hoy.",
  alternates: { canonical: "/ofertas" },
};

export default async function Ofertas() {
  const ofertas = await ofertasDelProveedor(60);
  return (
    <div>
      <Titulo sobre="Ofertas" bajada={`Lo que bajó en las últimas listas del proveedor. Los precios se actualizan todos los días: el de acá es el de hoy.`}>
        Bajaron de precio
      </Titulo>
      {ofertas.length ? (
        <>
          <h2 className="sr-only">Productos que bajaron</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ofertas.map((o) => (
              <TarjetaProducto key={o.codigo} p={o} antes={o.precioAntes} bajoPct={o.bajoPct} />
            ))}
          </div>
        </>
      ) : (
        <p className="text-stone-600">
          Ahora mismo no hay bajas de precio en los últimos {DIAS_DE_OFERTA} días.{" "}
          <Link href="/catalogo" className="font-semibold text-acopio-700 underline underline-offset-4">Mirá el catálogo completo</Link>, que se actualiza todos los días.
        </p>
      )}
    </div>
  );
}
