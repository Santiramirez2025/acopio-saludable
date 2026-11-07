import Link from "next/link";
import { BotonAgregar } from "@/components/Carrito";
import { Foto } from "@/components/Foto";
import { EnlaceWhatsapp } from "@/components/Whatsapp";
import { pesos } from "@/lib/precios";
import type { ProductoTienda } from "@/lib/tienda";

/** Tarjeta chica del producto bandera para la primera pantalla del inicio: precio, agregar y WhatsApp. */
export function DestacadoInicio({ p }: { p: Pick<ProductoTienda, "codigo" | "producto" | "presentacion" | "precio" | "transferencia" | "fotoUrl"> }) {
  return (
    <div className="mt-4 rounded-2xl bg-white p-3 text-acopio-900 shadow-ficha">
      <Link href={`/producto/${encodeURIComponent(p.codigo)}`} className="flex items-center gap-3">
        <Foto src={p.fotoUrl} alt={`${p.producto} ${p.presentacion}`} className="aspect-square w-16 shrink-0 overflow-hidden rounded-xl" sizes="64px" prioridad />
        <span className="min-w-0 flex-1">
          <span className="chip bg-sol text-acopio-900">El mix de la casa</span>
          <span className="mt-1 block truncate font-display text-base font-extrabold leading-tight">{p.producto} {p.presentacion}</span>
          <span className="block text-sm tabular-nums text-stone-700">
            <b className="text-lg text-acopio-900">{pesos(p.precio)}</b>
            {p.transferencia && <> · {pesos(p.transferencia)} por transferencia</>}
          </span>
        </span>
      </Link>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <BotonAgregar id={p.codigo} etiqueta="Agregar" conCantidad={false} className="w-full" />
        <EnlaceWhatsapp
          mensaje={`Hola! Quiero pedir:\n• 1 × ${p.producto} ${p.presentacion}: ${pesos(p.precio)}\n¿Me ayudás con el pedido?`}
          className="btn-whatsapp w-full justify-center"
          medirComo="whatsapp_desde_inicio"
        >
          Por WhatsApp
        </EnlaceWhatsapp>
      </div>
    </div>
  );
}
