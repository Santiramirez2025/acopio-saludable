import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { AVISO_SIN_TACC, WHERE_SIN_TACC, wherePublicado } from "@/lib/filtros-producto";
import { combosTienda, productosTienda } from "@/lib/tienda";
import { NICHOS, OBJETIVOS } from "@/lib/taxonomia";
import { pesos } from "@/lib/precios";
import { Foto } from "@/components/Foto";
import { BotonCargarPedido } from "@/components/Carrito";
import { RielProductos, TarjetaCombo, TituloSeccion } from "@/components/Tienda";

// Portadas propias de las góndolas; las demás usan la foto de un producto.
const GONDOLAS: Record<string, string> = {
  "Cereales y granolas": "/img/gondolas/cereales.webp",
  Especias: "/img/gondolas/especias.webp",
  "Harinas y Féculas": "/img/gondolas/harinas.webp",
  "Café, yerba e infusiones": "/img/gondolas/infusiones.webp",
  Legumbres: "/img/gondolas/legumbres.webp",
  "Semillas y granos": "/img/gondolas/semillas.webp",
};

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const cfg = await leerConfig();
  const publicado = wherePublicado(cfg.margenMinimoPct);
  const [sinTacc, totalSinTacc, ganchos, combos, pedidos, portadas, conteos, vendibles] = await Promise.all([
    productosTienda({ where: { AND: [WHERE_SIN_TACC, { fotoUrl: { not: null } }] }, take: 8 }),
    prisma.product.count({ where: { AND: [publicado, WHERE_SIN_TACC] } }),
    productosTienda({ where: { gancho: true }, take: 8 }),
    combosTienda({ tipo: "COMBO", activo: true }),
    combosTienda({ tipo: "PEDIDO_NICHO", activo: true }),
    prisma.product.findMany({ where: { AND: [publicado, { fotoUrl: { not: null } }] }, distinct: ["categoria"], orderBy: [{ categoria: "asc" }, { gancho: "desc" }, { vendidos: "desc" }, { precioPublico: "desc" }], select: { categoria: true, fotoUrl: true } }),
    prisma.product.groupBy({ by: ["categoria"], where: publicado, _count: true, orderBy: { _count: { categoria: "desc" } } }),
    prisma.product.findMany({ where: { AND: [publicado, { comboItems: { some: { combo: { tipo: "PEDIDO_NICHO" } } } }] }, select: { codigo: true } }),
  ]);
  const seVende = new Set(vendibles.map((v) => v.codigo));
  const disponibles = combos.filter((c) => c.disponible);
  const portada = new Map(portadas.map((p) => [p.categoria, p.fotoUrl]));
  const categorias = conteos.filter((c) => c.categoria !== "Sin categoría");
  const pasos = [
    ["Elegí", "Por rubro, por objetivo o buscando lo que necesitás."],
    [`Llegá a ${pesos(cfg.compraMinima)}`, "Es la compra mínima. El medidor te va diciendo cuánto falta."],
    ["Recibilo", cfg.entregaPropiaActiva ? `En Carlos Paz y el sur de Punilla te lo llevamos en ${cfg.plazoEntregaPropia}. Al resto del país, por correo en 3 a 9 días hábiles.` : "Lo compramos para vos y te lo enviamos por correo a todo el país en 3 a 9 días hábiles."],
  ];

  return (
    <div className="space-y-9 md:space-y-12">
      <section className="fondo-oscuro relative isolate -mx-4 -mt-5 overflow-hidden bg-acopio-900 px-4 pb-6 pt-4 text-white md:mx-0 md:mt-0 md:rounded-3xl md:px-10 md:py-12">
        {/* En el celular la foto va de fondo, bien oscurecida para que el texto se lea. */}
        <Image src="/img/portadas/hero.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-25 lg:hidden" />
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
          <div className="min-w-0">
            <h1 className="text-balance font-display text-[clamp(30px,9vw,38px)] font-extrabold leading-none tracking-tight sm:text-6xl">
              Llená tu despensa de una sola vez.
            </h1>
            <p className="mt-3 max-w-md text-[15px] text-white/80 sm:text-[17px]">
              Frutos secos, cereales, suplementos, snacks y especias por volumen, para tu casa o tu negocio. Desde {pesos(cfg.compraMinima)} por pedido, con envíos a todo el país.
            </p>
            <p className="mt-5 text-sm font-semibold text-sol">¿Para quién comprás?</p>
            <div className="riel mt-2 md:mx-0 md:flex-wrap md:px-0">
              {[...NICHOS].sort((a, b) => Number(b.id === "familias") - Number(a.id === "familias")).map((n) => (
                <Link key={n.id} href={`/nichos/${n.id}`} className="shrink-0 snap-start whitespace-nowrap flex min-h-[48px] items-center rounded-full bg-white/10 px-4 text-sm font-semibold hover:bg-white hover:text-acopio-900">{n.nombre}</Link>
              ))}
            </div>
            <Link href="/sin-tacc" className="mt-3 flex min-h-[48px] items-center gap-3 rounded-2xl bg-white/10 px-4 text-sm font-semibold hover:bg-white/15">
              <span className="chip bg-sol text-acopio-900">Sin TACC</span>
              <span className="min-w-0 flex-1">{totalSinTacc} productos sin gluten</span>
              <span aria-hidden="true">→</span>
            </Link>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link href="/armador" className="btn-comprar min-w-0 flex-1 whitespace-nowrap sm:flex-none">Armame un pedido</Link>
              <Link href="/catalogo" className="inline-flex min-h-[48px] min-w-0 flex-1 items-center whitespace-nowrap justify-center rounded-full border border-white/30 px-5 text-sm font-semibold hover:bg-white/10 sm:flex-none">Ver catálogo</Link>
            </div>
          </div>
          <div className="relative hidden aspect-[4/3] w-full overflow-hidden rounded-3xl lg:block" aria-hidden="true">
            <Image src="/img/portadas/hero.webp" alt="" fill priority sizes="480px" className="object-cover" />
          </div>
        </div>
      </section>

      {sinTacc.length > 0 && (
        <section className="rounded-3xl bg-acopio-100 p-4 sm:p-6">
          <TituloSeccion href="/sin-tacc" enlace={`Ver los ${totalSinTacc}`}>Góndola sin TACC</TituloSeccion>
          <p className="-mt-1 mb-3 max-w-2xl text-sm text-stone-700">{AVISO_SIN_TACC}</p>
          <RielProductos productos={sinTacc} />
        </section>
      )}

      {pedidos.length > 0 && (
        <section>
          <TituloSeccion href="/nichos" enlace="Todos los rubros">Pedidos listos por rubro</TituloSeccion>
          <div className="riel lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {[...pedidos].sort((a, b) => Number(b.nicho === "familias") - Number(a.nicho === "familias")).map((p) => {
              const items = p.items.filter((i) => seVende.has(i.producto.codigo));
              const total = items.reduce((s, i) => s + i.producto.precio * i.cantidad, 0);
              return (
                <article key={p.slug} className="flex w-[78%] shrink-0 snap-start flex-col rounded-2xl bg-white p-3 shadow-ficha sm:w-[44%] lg:w-auto">
                  <div className="grid grid-cols-4 gap-1.5">
                    {items.slice(0, 4).map((i) => (
                      <Foto key={i.producto.codigo} src={i.producto.fotoUrl} alt="" etiqueta=" " className="aspect-square w-full rounded-lg" />
                    ))}
                  </div>
                  <h3 className="mt-3 font-display text-xl font-bold leading-tight"><Link href={`/nichos/${p.nicho}`} className="hover:underline">{p.nombre.replace(/^Pedido /, "")}</Link></h3>
                  <p className="text-xs text-stone-600">{items.length} productos, {items.reduce((s, i) => s + i.cantidad, 0)} unidades</p>
                  <p className="mt-2 font-display text-2xl font-bold tabular-nums">{pesos(total)}</p>
                  <p className="mb-3 text-xs text-stone-600">{total >= cfg.compraMinima ? "Ya llega a la compra mínima" : `Te quedan ${pesos(cfg.compraMinima - total)} para completar el mínimo`}</p>
                  <div className="mt-auto flex gap-2">
                    <BotonCargarPedido etiqueta="Cargar pedido" className="btn-comprar flex-1" lineas={items.map((i) => ({ tipo: "producto" as const, id: i.producto.codigo, cantidad: i.cantidad }))} />
                    <Link href={`/nichos/${p.nicho}`} className="btn-sec px-4">Ajustar</Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {ganchos.length > 0 && (
        <section>
          <TituloSeccion href="/catalogo" enlace="Ver catálogo">Los que más se llevan</TituloSeccion>
          <RielProductos productos={ganchos} />
        </section>
      )}

      {categorias.length > 0 && (
        <section>
          <TituloSeccion>Recorré por góndola</TituloSeccion>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
            {categorias.map((c) => (
              <Link key={c.categoria} href={`/catalogo?categoria=${encodeURIComponent(c.categoria)}`} className="group rounded-2xl bg-white p-2 shadow-ficha">
                <Foto src={GONDOLAS[c.categoria] ?? portada.get(c.categoria) ?? null} alt="" etiqueta=" " className="aspect-square w-full rounded-xl" />
                <p className="mt-2 line-clamp-2 px-1 text-[13px] font-semibold leading-tight group-hover:underline">{c.categoria}</p>
                <p className="px-1 pb-1 text-[11px] text-stone-600">{c._count} productos</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {disponibles.length > 0 && (
        <section>
          <TituloSeccion href="/combos" enlace="Todos los combos">Combos armados</TituloSeccion>
          <div className="riel lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {[...disponibles].sort((a, b) => b.descuentoPct - a.descuentoPct || Number(b.destacado) - Number(a.destacado)).slice(0, 4).map((c) => (
              <TarjetaCombo key={c.slug} c={c} className="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-auto" />
            ))}
          </div>
        </section>
      )}

      <section>
        <TituloSeccion href="/objetivos" enlace="Explorar">Comprá por objetivo de bienestar</TituloSeccion>
        <div className="flex flex-wrap gap-2">
          {OBJETIVOS.map((o) => (
            <Link key={o.id} href={`/objetivos/${o.id}`} className="flex min-h-[48px] items-center rounded-full bg-white px-4 text-sm font-semibold shadow-ficha hover:bg-acopio-900 hover:text-white">{o.nombre}</Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-acopio-100 p-5 sm:p-8">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Cómo se compra</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {pasos.map(([titulo, texto], i) => (
            <li key={titulo} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-acopio-900 font-display text-lg font-bold text-sol">{i + 1}</span>
              <div>
                <h3 className="font-semibold">{titulo}</h3>
                <p className="text-sm text-stone-600">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
