import Link from "next/link";
import type { ComboTienda, ProductoTienda } from "@/lib/tienda";
import { pesos, precioPorUnidadSuelta, renglonCombo } from "@/lib/precios";
import { AVISO_SUPLEMENTOS } from "@/lib/sitio";
import { Foto } from "./Foto";
import { AgregarRapido, BotonAgregar } from "./Carrito";

export function TarjetaProducto({ p, className = "", antes, bajoPct }: { p: ProductoTienda; className?: string; antes?: number; bajoPct?: number }) {
  const href = `/producto/${encodeURIComponent(p.codigo)}`;
  // Si el envase trae varias unidades, mostramos cuánto sale cada una: es lo que el cliente compara.
  const cadaUna = precioPorUnidadSuelta(p.precio, p.presentacion);
  return (
    <article className={`flex min-w-0 flex-col rounded-2xl bg-white p-2 shadow-ficha ${className}`}>
      {/* El enlace del nombre se estira sobre la foto y el texto: un solo destino, grande y fácil de tocar. */}
      <div className="relative flex flex-1 flex-col">
        <Foto src={p.fotoUrl} alt="" etiqueta={p.categoria} className="aspect-square w-full rounded-xl" />
        {p.sinTacc && <span className="chip absolute left-2 top-2 bg-acopio-900 text-white">Sin TACC</span>}
        {/* La baja la decide el proveedor y dura lo que dure: por eso se muestra cuánto bajó,
            no una promo nuestra con fecha. */}
        {bajoPct ? <span className="chip absolute right-2 top-2 bg-sol font-bold text-acopio-900">−{bajoPct}%</span> : null}
        <div className="flex flex-1 flex-col px-1.5 pt-2.5">
          <h3 className="text-[15px] font-semibold leading-snug"><Link href={href} className="estirado line-clamp-2 after:absolute after:inset-0 after:rounded-xl hover:underline">{p.producto}</Link></h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-stone-600">{p.presentacion}</p>
          <div className="mt-auto pb-2.5 pt-2">
            <p className="flex flex-wrap items-baseline gap-x-2 font-display text-xl font-bold leading-none tabular-nums">
              {pesos(p.precio)}
              {antes && antes > p.precio ? <span className="text-sm font-semibold text-stone-500 line-through">{pesos(antes)}</span> : null}
            </p>
            {cadaUna && <p className="mt-1 text-[11px] leading-none tabular-nums text-stone-600">{pesos(cadaUna)} por unidad</p>}
          </div>
        </div>
      </div>
      <div className="px-1.5 pb-1.5">
        <AgregarRapido id={p.codigo} nombre={p.producto} />
      </div>
    </article>
  );
}

export function GrillaProductos({ productos }: { productos: ProductoTienda[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {productos.map((p) => (
        <TarjetaProducto key={p.codigo} p={p} />
      ))}
    </div>
  );
}

/** Fila que se desliza con el dedo en el celular y pasa a grilla en pantallas grandes. */
export function RielProductos({ productos }: { productos: ProductoTienda[] }) {
  return (
    <div className="riel lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
      {productos.map((p) => (
        <TarjetaProducto key={p.codigo} p={p} className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-auto" />
      ))}
    </div>
  );
}

/** El riel de los que bajaron: misma tarjeta, con el precio de antes y cuánto bajó. */
export function RielOfertas({ ofertas }: { ofertas: (ProductoTienda & { precioAntes: number; bajoPct: number })[] }) {
  return (
    <div className="riel lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
      {ofertas.map((o) => (
        <TarjetaProducto key={o.codigo} p={o} antes={o.precioAntes} bajoPct={o.bajoPct} className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-auto" />
      ))}
    </div>
  );
}

/**
 * Qué trae un combo, entero y sin recortar.
 * Donde aparece un combo el cliente tiene que ver de un vistazo todo lo que se lleva:
 * una lista cortada en "…" obliga a entrar a la ficha para saber qué está comprando.
 */
export function ListaCombo({ items, oscuro = false }: { items: { producto: ProductoTienda; cantidad: number }[]; oscuro?: boolean }) {
  const unidades = items.reduce((s, i) => s + i.cantidad, 0);
  return (
    <div className="mt-2">
      <p className={`text-[11px] font-bold uppercase tracking-wide ${oscuro ? "text-sol" : "text-acopio-700"}`}>
        Trae {items.length} productos{unidades !== items.length ? `, ${unidades} unidades` : ""}
      </p>
      <ul className={`mt-1 space-y-px text-xs leading-snug ${oscuro ? "text-white/85" : "text-stone-700"}`}>
        {items.map(({ producto, cantidad }) => (
          <li key={producto.codigo}>{renglonCombo(producto, cantidad)}</li>
        ))}
      </ul>
    </div>
  );
}

export function TarjetaCombo({ c, className = "", llegaAlMinimo = false }: { c: ComboTienda; className?: string; llegaAlMinimo?: boolean }) {
  return (
    <article className={`fondo-oscuro flex flex-col rounded-2xl bg-acopio-900 p-3 text-white ${className}`}>
      <div className="relative">
        {c.fotoUrl ? (
          <Foto src={c.fotoUrl} alt="" etiqueta=" " className="aspect-[4/3] w-full rounded-xl" sizes="(max-width: 640px) 78vw, (max-width: 1024px) 44vw, 300px" />
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {c.items.slice(0, 4).map((i) => (
              <Foto key={i.producto.codigo} src={i.producto.fotoUrl} alt="" etiqueta=" " className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        )}
      <h3 className="mt-3 font-display text-xl font-bold leading-tight"><Link href={`/combos/${c.slug}`} className="estirado after:absolute after:inset-0 after:rounded-xl hover:underline">{c.nombre}</Link></h3>
      <ListaCombo items={c.items} oscuro />
      </div>
      <div className="mt-auto flex flex-wrap items-baseline gap-2 pb-3 pt-3">
        <span className="font-display text-2xl font-bold tabular-nums">{pesos(c.precio)}</span>
        {c.ahorro > 0 && <span className="text-sm tabular-nums text-white/70 line-through">{pesos(c.precioLista)}</span>}
        {c.descuentoPct > 0 && <span className="chip bg-sol text-acopio-900">{c.descuentoPct}% menos</span>}
        {/* El freno de la tienda es la compra mínima: 174 carritos y 10 checkouts el 11/10.
            Decirle al cliente cuál se puede pagar solo le ahorra la sorpresa en el checkout. */}
        {llegaAlMinimo && <span className="w-full text-sm font-semibold text-sol">Con este combo ya llegás a la compra mínima</span>}
      </div>
      <BotonAgregar tipo="combo" id={c.slug} etiqueta="Agregar combo" conCantidad={false} />
    </article>
  );
}

export function AvisoSuplementos() {
  return <p className="rounded-xl bg-tierra-100 px-3.5 py-2.5 text-xs text-stone-600">{AVISO_SUPLEMENTOS}</p>;
}

export function Titulo({ sobre, children, bajada }: { sobre?: string; children: React.ReactNode; bajada?: string }) {
  return (
    <div className="mb-5">
      {sobre && <p className="mb-1 text-sm font-semibold text-acopio-600">{sobre}</p>}
      <h1 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-acopio-900 sm:text-4xl">{children}</h1>
      {bajada && <p className="mt-2 max-w-2xl text-stone-600">{bajada}</p>}
    </div>
  );
}

export function TituloSeccion({ children, href, enlace }: { children: React.ReactNode; href?: string; enlace?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-acopio-900">{children}</h2>
      {href && <Link href={href} className="-my-2 flex min-h-[48px] items-center whitespace-nowrap text-sm font-semibold text-acopio-600 underline underline-offset-4">{enlace}</Link>}
    </div>
  );
}
