import Link from "next/link";
import type { ComboTienda, ProductoTienda } from "@/lib/tienda";
import { pesos, precioPorUnidadBase } from "@/lib/precios";
import { AVISO_SUPLEMENTOS } from "@/lib/sitio";
import { Foto } from "./Foto";
import { AgregarRapido, BotonAgregar } from "./Carrito";

export function TarjetaProducto({ p, className = "" }: { p: ProductoTienda; className?: string }) {
  const porUnidad = precioPorUnidadBase(p.precio, p.contenido, p.unidad);
  const href = `/producto/${encodeURIComponent(p.codigo)}`;
  return (
    <article className={`flex flex-col rounded-2xl bg-white p-2 shadow-ficha ${className}`}>
      <Link href={href} className="block">
        <Foto src={p.fotoUrl} alt={`${p.producto} ${p.presentacion}`} etiqueta={p.categoria} className="aspect-square w-full rounded-xl" />
      </Link>
      <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-2.5">
        <Link href={href} className="line-clamp-2 text-[15px] font-semibold leading-snug hover:underline">{p.producto}</Link>
        <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{p.presentacion}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pb-2.5 pt-2">
          <p className="font-display text-xl font-bold leading-none tabular-nums">{pesos(p.precio)}</p>
          {porUnidad && <p className="text-right text-[11px] leading-tight tabular-nums text-stone-500">{pesos(porUnidad.valor)}<br />{porUnidad.etiqueta}</p>}
        </div>
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

export function TarjetaCombo({ c, className = "" }: { c: ComboTienda; className?: string }) {
  return (
    <article className={`flex flex-col rounded-2xl bg-acopio-900 p-3 text-white ${className}`}>
      <Link href={`/combos/${c.slug}`} className="grid grid-cols-4 gap-1.5">
        {c.items.slice(0, 4).map((i) => (
          <Foto key={i.producto.codigo} src={i.producto.fotoUrl} alt="" etiqueta=" " className="aspect-square w-full rounded-lg" />
        ))}
      </Link>
      <Link href={`/combos/${c.slug}`} className="mt-3 font-display text-xl font-bold leading-tight hover:underline">{c.nombre}</Link>
      <p className="mt-1 line-clamp-2 text-xs text-white/70">{c.items.map((i) => `${i.cantidad > 1 ? `${i.cantidad} × ` : ""}${i.producto.producto}`).join(", ")}</p>
      <div className="mt-auto flex items-baseline gap-2 pb-3 pt-3">
        <span className="font-display text-2xl font-bold tabular-nums">{pesos(c.precio)}</span>
        {c.ahorro > 0 && <span className="text-sm tabular-nums text-white/50 line-through">{pesos(c.precioLista)}</span>}
        {c.descuentoPct > 0 && <span className="chip bg-sol text-acopio-900">{c.descuentoPct}% menos</span>}
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
      {href && <Link href={href} className="whitespace-nowrap text-sm font-semibold text-acopio-600 underline underline-offset-4">{enlace}</Link>}
    </div>
  );
}
