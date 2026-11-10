import Link from "next/link";
import { BotonAgregar } from "@/components/Carrito";
import { Foto } from "@/components/Foto";
import { EnlaceWhatsapp } from "@/components/Whatsapp";
import { pesos } from "@/lib/precios";
import type { ComboTienda, ProductoTienda } from "@/lib/tienda";

/** Tarjeta chica del producto bandera para la primera pantalla del inicio: precio, agregar y WhatsApp. */
export function DestacadoInicio({ p, etiqueta = "El mix de la casa" }: { p: Pick<ProductoTienda, "codigo" | "producto" | "presentacion" | "precio" | "transferencia" | "fotoUrl">; etiqueta?: string }) {
  return (
    <div className="mt-4 rounded-2xl bg-white p-3 text-acopio-900 shadow-ficha">
      <Link href={`/producto/${encodeURIComponent(p.codigo)}`} className="flex items-center gap-3">
        <Foto src={p.fotoUrl} alt={`${p.producto} ${p.presentacion}`} className="aspect-square w-16 shrink-0 overflow-hidden rounded-xl" sizes="64px" prioridad />
        <span className="min-w-0 flex-1">
          <span className="chip bg-sol text-acopio-900">{etiqueta}</span>
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

/** La misma tarjeta para un combo (10/11: sin el mix, el Trío del desayuno): fotos de lo que trae, precio, agregar y WhatsApp. */
export function DestacadoComboInicio({ c, etiqueta, transferencia }: { c: Pick<ComboTienda, "slug" | "nombre" | "precio" | "items">; etiqueta: string; transferencia: number | null }) {
  const trae = c.items.map((i) => `${i.cantidad > 1 ? `${i.cantidad} × ` : ""}${i.producto.producto} ${i.producto.presentacion}`.trim());
  return (
    <div className="mt-4 rounded-2xl bg-white p-3 text-acopio-900 shadow-ficha">
      <Link href={`/combos/${encodeURIComponent(c.slug)}`} className="flex items-center gap-3">
        <span className="grid aspect-square w-16 shrink-0 grid-cols-2 gap-0.5 overflow-hidden rounded-xl">
          {c.items.slice(0, 4).map((i) => (
            <Foto key={i.producto.codigo} src={i.producto.fotoUrl} alt="" etiqueta=" " className="aspect-square w-full" sizes="32px" prioridad />
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="chip bg-sol text-acopio-900">{etiqueta}</span>
          <span className="mt-1 block truncate font-display text-base font-extrabold leading-tight">{c.nombre}</span>
          <span className="block text-sm tabular-nums text-stone-700">
            <b className="text-lg text-acopio-900">{pesos(c.precio)}</b>
            {transferencia && <> · {pesos(transferencia)} por transferencia</>}
          </span>
        </span>
      </Link>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <BotonAgregar tipo="combo" id={c.slug} etiqueta="Agregar" conCantidad={false} className="w-full" />
        <EnlaceWhatsapp
          mensaje={`Hola! Quiero pedir:\n• 1 × ${c.nombre}: ${pesos(c.precio)}\n  (${trae.join(", ")})\n¿Me ayudás con el pedido?`}
          className="btn-whatsapp w-full justify-center"
          medirComo="whatsapp_desde_inicio"
        >
          Por WhatsApp
        </EnlaceWhatsapp>
      </div>
    </div>
  );
}
