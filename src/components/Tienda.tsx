import Link from "next/link";
import type { ComboTienda, ProductoTienda } from "@/lib/tienda";
import { pesos, precioPorUnidadBase } from "@/lib/precios";
import { AVISO_SUPLEMENTOS } from "@/lib/sitio";
import { Foto } from "./Foto";
import { BotonAgregar } from "./Carrito";

export function TarjetaProducto({ p }: { p: ProductoTienda }) {
  const porUnidad = precioPorUnidadBase(p.precio, p.contenido, p.unidad);
  const href = `/producto/${encodeURIComponent(p.codigo)}`;
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-tierra-200 bg-white">
      <Link href={href} className="block">
        <Foto src={p.fotoUrl} alt={`${p.producto} ${p.presentacion}`} etiqueta={p.categoria} className="aspect-square w-full" />
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">{p.marca}</p>
        <Link href={href} className="text-sm font-medium leading-snug hover:underline">{p.producto}</Link>
        <p className="text-xs text-stone-500">{p.presentacion}</p>
        <div className="mt-auto pt-2">
          <p className="text-lg font-semibold tabular-nums">{pesos(p.precio)}</p>
          {porUnidad && <p className="text-xs tabular-nums text-stone-500">{pesos(porUnidad.valor)} {porUnidad.etiqueta}</p>}
        </div>
        <BotonAgregar id={p.codigo} conCantidad={false} className="mt-2" />
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

export function TarjetaCombo({ c }: { c: ComboTienda }) {
  return (
    <article className="flex flex-col rounded-xl border border-tierra-200 bg-white p-4">
      <div className="mb-3 grid grid-cols-4 gap-1">
        {c.items.slice(0, 4).map((i) => (
          <Foto key={i.producto.codigo} src={i.producto.fotoUrl} alt="" etiqueta=" " className="aspect-square w-full rounded-md" />
        ))}
      </div>
      <Link href={`/combos/${c.slug}`} className="font-display text-lg font-semibold hover:underline">{c.nombre}</Link>
      <p className="mt-1 line-clamp-2 text-xs text-stone-500">{c.items.map((i) => `${i.cantidad > 1 ? `${i.cantidad} × ` : ""}${i.producto.producto}`).join(" · ")}</p>
      <div className="mt-auto flex items-baseline gap-2 pt-3">
        <span className="text-lg font-semibold tabular-nums">{pesos(c.precio)}</span>
        {c.ahorro > 0 && <span className="text-sm tabular-nums text-stone-400 line-through">{pesos(c.precioLista)}</span>}
        {c.descuentoPct > 0 && <span className="chip bg-acopio-100 text-acopio-700">{c.descuentoPct}% off</span>}
      </div>
      <BotonAgregar tipo="combo" id={c.slug} etiqueta="Agregar combo" conCantidad={false} className="mt-2" />
    </article>
  );
}

export function AvisoSuplementos() {
  return <p className="rounded-lg border border-tierra-200 bg-tierra-100 px-3 py-2 text-xs text-tierra-700">{AVISO_SUPLEMENTOS}</p>;
}

export function Titulo({ sobre, children, bajada }: { sobre?: string; children: React.ReactNode; bajada?: string }) {
  return (
    <div className="mb-5">
      {sobre && <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-tierra-500">{sobre}</p>}
      <h1 className="font-display text-3xl font-semibold text-acopio-900 sm:text-4xl">{children}</h1>
      {bajada && <p className="mt-2 max-w-2xl text-stone-600">{bajada}</p>}
    </div>
  );
}
