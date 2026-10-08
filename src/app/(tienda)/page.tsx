import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { wherePublicado } from "@/lib/filtros-producto";
import { combosTienda, productosTienda } from "@/lib/tienda";
import { NICHOS, OBJETIVOS } from "@/lib/taxonomia";
import { pesos } from "@/lib/precios";
import { Foto } from "@/components/Foto";
import { BotonCargarPedido } from "@/components/Carrito";
import { RielProductos, TarjetaCombo, TituloSeccion } from "@/components/Tienda";

export default async function Home() {
  const cfg = await leerConfig();
  const publicado = wherePublicado(cfg.margenMinimoPct);
  const [ganchos, combos, pedidos, portadas, conteos, vendibles] = await Promise.all([
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
  const vitrina = ganchos.filter((g) => g.fotoUrl).slice(0, 3);
  const pasos = [
    ["Elegí", "Por rubro, por objetivo o buscando lo que necesitás."],
    [`Llegá a ${pesos(cfg.compraMinima)}`, "Es la compra mínima. El medidor te va diciendo cuánto falta."],
    ["Recibilo", "Lo compramos para vos y te lo enviamos a todo el país."],
  ];

  return (
    <div className="space-y-12">
      <section className="-mx-4 -mt-5 bg-acopio-900 px-4 pb-8 pt-6 text-white md:-mt-8 md:mx-0 md:rounded-3xl md:px-10 md:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <h1 className="font-display text-[42px] font-extrabold leading-[.95] tracking-tight sm:text-6xl">
              Llená la despensa de tu negocio de una sola vez.
            </h1>
            <p className="mt-4 max-w-md text-[17px] text-white/80">
              Frutos secos, cereales, suplementos, snacks y especias por volumen, a precio de lista. Envíos a todo el país desde Villa Carlos Paz.
            </p>
            <p className="mt-6 text-sm font-semibold text-sol">¿Para quién comprás?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {NICHOS.map((n) => (
                <Link key={n.id} href={`/nichos/${n.id}`} className="rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white hover:text-acopio-900">{n.nombre}</Link>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/armador" className="btn-comprar">Armame un pedido</Link>
              <Link href="/catalogo" className="inline-flex min-h-[44px] items-center rounded-full border border-white/30 px-5 text-sm font-semibold hover:bg-white/10">Ver todo el catálogo</Link>
            </div>
          </div>
          {vitrina.length === 3 && (
            <div className="relative mx-auto hidden h-[340px] w-full max-w-md lg:block" aria-hidden="true">
              {vitrina.map((p, i) => (
                <div key={p.codigo} className={`absolute w-44 rounded-2xl bg-white p-2 text-acopio-900 shadow-dock ${["left-0 top-6 -rotate-6", "left-32 top-0 z-10 rotate-2", "right-0 top-24 rotate-6"][i]}`}>
                  <Foto src={p.fotoUrl} alt="" className="aspect-square w-full rounded-xl" prioridad />
                  <p className="mt-2 line-clamp-1 px-1 text-xs font-semibold">{p.producto}</p>
                  <p className="px-1 pb-1 font-display text-lg font-bold tabular-nums">{pesos(p.precio)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {pedidos.length > 0 && (
        <section>
          <TituloSeccion href="/nichos" enlace="Todos los rubros">Pedidos listos por rubro</TituloSeccion>
          <div className="riel lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {pedidos.map((p) => {
              const items = p.items.filter((i) => seVende.has(i.producto.codigo));
              const total = items.reduce((s, i) => s + i.producto.precio * i.cantidad, 0);
              return (
                <article key={p.slug} className="flex w-[78%] shrink-0 snap-start flex-col rounded-2xl bg-white p-3 shadow-ficha sm:w-[44%] lg:w-auto">
                  <div className="grid grid-cols-4 gap-1.5">
                    {items.slice(0, 4).map((i) => (
                      <Foto key={i.producto.codigo} src={i.producto.fotoUrl} alt="" etiqueta=" " className="aspect-square w-full rounded-lg" />
                    ))}
                  </div>
                  <Link href={`/nichos/${p.nicho}`} className="mt-3 font-display text-xl font-bold leading-tight hover:underline">{p.nombre.replace(/^Pedido /, "")}</Link>
                  <p className="text-xs text-stone-500">{items.length} productos, {items.reduce((s, i) => s + i.cantidad, 0)} unidades</p>
                  <p className="mt-2 font-display text-2xl font-bold tabular-nums">{pesos(total)}</p>
                  <p className="mb-3 text-xs text-stone-500">{total >= cfg.compraMinima ? "Ya llega a la compra mínima" : `Te quedan ${pesos(cfg.compraMinima - total)} para completar el mínimo`}</p>
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
                <Foto src={portada.get(c.categoria) ?? null} alt="" etiqueta=" " className="aspect-square w-full rounded-xl" />
                <p className="mt-2 line-clamp-2 px-1 text-[13px] font-semibold leading-tight group-hover:underline">{c.categoria}</p>
                <p className="px-1 pb-1 text-[11px] text-stone-500">{c._count} productos</p>
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
            <Link key={o.id} href={`/objetivos/${o.id}`} className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold shadow-ficha hover:bg-acopio-900 hover:text-white">{o.nombre}</Link>
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
                <p className="font-semibold">{titulo}</p>
                <p className="text-sm text-stone-600">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
