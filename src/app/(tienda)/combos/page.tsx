import type { Metadata } from "next";
import Link from "next/link";
import { leerConfig } from "@/lib/config";
import { pesos } from "@/lib/precios";
import { umbralZona, zonaSinMinimo } from "@/lib/minimo-zona";
import { combosTienda } from "@/lib/tienda";
import { ordenarCombos } from "@/lib/destacado-inicio";
import { TarjetaCombo, Titulo } from "@/components/Tienda";

export const metadata: Metadata = { title: "Combos y promociones", description: "Combos de productos saludables que van bien juntos, con descuento y listos para sumar al pedido. Envíos a todo el país.", alternates: { canonical: "/combos" } };

export default async function Combos() {
  const cfg = await leerConfig();
  // Los combos que se empujan esta semana van primero (Laura 10/11: Trío del desayuno y Pan dulce casero).
  const combos = ordenarCombos((await combosTienda({ tipo: "COMBO", activo: true })).filter((c) => c.disponible));
  return (
    <div>
      <Titulo sobre="Combos" bajada={`Productos que van bien juntos, más baratos que comprándolos por separado. ${zonaSinMinimo(cfg) ? `En Villa Carlos Paz, entrega sin cargo desde ${pesos(umbralZona(cfg))}; al resto de la zona, con costo según la localidad.` : "Sumá dos o tres y ya llegás a la compra mínima."}`}>Combos y promociones</Titulo>
      {combos.length ? (
        <><h2 className="sr-only">Combos disponibles</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{combos.map((c) => <TarjetaCombo key={c.slug} c={c} />)}</div></>
      ) : (
        <p className="text-stone-600">No hay combos disponibles en este momento.</p>
      )}
      <p className="mt-6 text-sm text-stone-600">
        Para las fiestas: <Link href="/mesa-dulce-navidad" className="font-semibold text-acopio-700 underline underline-offset-2">cuánto comprar para la mesa dulce de Navidad</Link> y <Link href="/regalos-navidenos-cordoba" className="font-semibold text-acopio-700 underline underline-offset-2">regalos navideños con frutos secos</Link>.
      </p>
    </div>
  );
}
