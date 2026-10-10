import { Foto } from "@/components/Foto";
import type { Metadata } from "next";
import { pesos } from "@/lib/precios";
import { GONDOLAS } from "@/lib/gondolas";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { AVISO_SIN_TACC, WHERE_SIN_TACC, wherePublicado } from "@/lib/filtros-producto";
import { aTienda } from "@/lib/tienda";
import { NICHOS, NICHO_IDS, OBJETIVOS, OBJETIVO_IDS } from "@/lib/taxonomia";
import { GrillaProductos, Titulo } from "@/components/Tienda";

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const filtros = Object.entries(sp).filter(([k, v]) => v && k !== "categoria");
  // Búsquedas y combinaciones de filtros no se indexan: solo el catálogo y cada góndola.
  if (sp.sintacc === "1" && !q) {
    const otros = Object.entries(sp).filter(([k, v]) => v && k !== "sintacc");
    return {
      title: "Productos sin TACC por volumen",
      description: "Harinas, galletitas, snacks, cereales y más productos rotulados sin TACC, por volumen y con envíos a todo el país.",
      alternates: { canonical: "/sin-tacc" },
      robots: otros.length ? { index: false, follow: true } : undefined,
    };
  }
  if (q) return { title: `Resultados para "${q}"`, robots: { index: false, follow: true } };
  if (sp.categoria) {
    return {
      title: `${sp.categoria} por kilo y por volumen: precios`,
      description: (GONDOLAS[sp.categoria]?.intro ?? `${sp.categoria}: comprá por volumen en Acopio Saludable.`) + " Envíos a todo el país.",
      alternates: { canonical: `/catalogo?categoria=${encodeURIComponent(sp.categoria)}` },
      robots: filtros.length ? { index: false, follow: true } : undefined,
    };
  }
  return {
    title: "Catálogo de productos saludables",
    description: "Catálogo completo: frutos secos, cereales, suplementos, snacks, especias y más, por volumen y con envíos a todo el país.",
    alternates: { canonical: "/catalogo" },
    robots: filtros.length ? { index: false, follow: true } : undefined,
  };
}

const POR_PAGINA = 24;
const ORDENES: Record<string, { nombre: string; orderBy: Prisma.ProductOrderByWithRelationInput[] }> = {
  destacados: { nombre: "Destacados", orderBy: [{ gancho: "desc" }, { vendidos: "desc" }, { fotoUrl: { sort: "asc", nulls: "last" } }, { producto: "asc" }, { codigo: "asc" }] },
  vendidos: { nombre: "Más vendidos", orderBy: [{ vendidos: "desc" }, { producto: "asc" }, { codigo: "asc" }] },
  "precio-asc": { nombre: "Menor precio", orderBy: [{ precioPublico: "asc" }, { codigo: "asc" }] },
  "precio-desc": { nombre: "Mayor precio", orderBy: [{ precioPublico: "desc" }, { codigo: "asc" }] },
};
type SP = Record<string, string | undefined>;

function precio(v: string | undefined): number | undefined {
  const n = Number(v);
  return v && Number.isFinite(n) && n >= 0 ? n : undefined;
}

export default async function Catalogo({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const cfg = await leerConfig();
  const q = (sp.q ?? "").trim().slice(0, 80);
  const orden = sp.orden && ORDENES[sp.orden] ? sp.orden : "destacados";
  const pagina = Math.max(1, Number.parseInt(sp.pagina ?? "1", 10) || 1);
  const nicho = NICHO_IDS.includes(sp.nicho ?? "") ? sp.nicho! : "";
  const objetivo = OBJETIVO_IDS.includes(sp.objetivo ?? "") ? sp.objetivo! : "";
  const min = precio(sp.min);
  const max = precio(sp.max);
  const sinTacc = sp.sintacc === "1";
  const base = wherePublicado(cfg.margenMinimoPct);
  const filtrosSeo = ["marca", "formato", "nicho", "objetivo", "min", "max"].filter((k) => sp[k]).length;

  const where: Prisma.ProductWhereInput = {
    AND: [
      base,
      sinTacc ? WHERE_SIN_TACC : {},
      sp.categoria ? { categoria: sp.categoria } : {},
      sp.marca ? { marca: sp.marca } : {},
      sp.formato ? { formato: sp.formato } : {},
      nicho ? { nichos: { has: nicho } } : {},
      objetivo ? { objetivos: { has: objetivo } } : {},
      min !== undefined || max !== undefined ? { precioPublico: { gte: min, lte: max } } : {},
      q
        ? { OR: [{ producto: { contains: q, mode: "insensitive" } }, { marca: { contains: q, mode: "insensitive" } }, { presentacion: { contains: q, mode: "insensitive" } }, { codigo: q }] }
        : {},
    ],
  };
  const distintos = (campo: "categoria" | "marca" | "formato") =>
    prisma.product.findMany({ where: base, distinct: [campo], select: { [campo]: true }, orderBy: { [campo]: "asc" } }) as unknown as Promise<Record<string, string>[]>;
  const [total, filas, categorias, marcas, formatos] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy: ORDENES[orden].orderBy, skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA }),
    distintos("categoria"),
    distintos("marca"),
    distintos("formato"),
  ]);
  const gondola = sp.categoria && !q && !sinTacc && filtrosSeo === 0 ? GONDOLAS[sp.categoria] : undefined;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlace = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "pagina") u.set(k, v);
    if (p > 1) u.set("pagina", String(p));
    return `/catalogo?${u}`;
  };
  const filtrosActivos = ["categoria", "marca", "formato", "nicho", "objetivo", "min", "max"].filter((k) => sp[k]).length;
  const Select = ({ name, vacio, opciones }: { name: string; vacio: string; opciones: { v: string; t: string }[] }) => (
    <select name={name} defaultValue={sp[name] ?? ""} className="campo" aria-label={vacio}>
      <option value="">{vacio}</option>
      {opciones.map((o) => (
        <option key={o.v} value={o.v}>{o.t}</option>
      ))}
    </select>
  );

  return (
    <div>
      <Titulo bajada={sinTacc ? AVISO_SIN_TACC : gondola?.intro}>{q ? `Resultados para "${q}"` : sinTacc ? (sp.categoria ? `${sp.categoria} sin TACC` : "Productos sin TACC") : sp.categoria || "Todo el catálogo"}</Titulo>
      {sinTacc && !q && pagina === 1 && <Foto src="/img/portadas/sin-tacc.webp" alt="" className="mb-4 aspect-[16/9] w-full rounded-3xl sm:aspect-[21/7]" prioridad sizes="(max-width: 1024px) 100vw, 1100px" />}
      <nav className="riel mb-3 md:mx-0 md:flex-wrap md:px-0" aria-label="Góndolas">
        <Link href="/sin-tacc" aria-current={sinTacc ? "page" : undefined} className={`chip min-h-[48px] shrink-0 snap-start whitespace-nowrap px-4 text-sm ${sinTacc ? "bg-acopio-900 text-white" : "bg-acopio-100 text-acopio-900 ring-1 ring-acopio-600"}`}>Sin TACC</Link>
        <Link href="/catalogo" aria-current={!sp.categoria && !sinTacc ? "page" : undefined} className={`chip min-h-[48px] shrink-0 snap-start px-4 text-sm ${!sp.categoria && !sinTacc ? "bg-acopio-900 text-white" : "bg-white text-acopio-900 shadow-ficha"}`}>Todo</Link>
        {categorias.map((c) => (
          <Link key={c.categoria} href={`/catalogo?${sinTacc ? "sintacc=1&" : ""}categoria=${encodeURIComponent(c.categoria)}`} className={`chip min-h-[48px] shrink-0 snap-start whitespace-nowrap px-4 text-sm ${sp.categoria === c.categoria ? "bg-acopio-900 text-white" : "bg-white text-acopio-900 shadow-ficha"}`}>{c.categoria}</Link>
        ))}
      </nav>
      <h2 className="sr-only">Buscar y filtrar productos</h2>
      <form action="/catalogo" className="mb-5 rounded-2xl bg-white p-3 shadow-ficha">
        {sinTacc && <input type="hidden" name="sintacc" value="1" />}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {/* En el celular el buscador ya está arriba, siempre a la vista: acá se oculta para que los productos aparezcan antes. */}
          <input name="q" defaultValue={q} placeholder="Buscar" aria-label="Buscar en el catálogo" className="campo col-span-2 hidden sm:block" />
          <select name="orden" defaultValue={orden} className="campo" aria-label="Ordenar por">
            {Object.entries(ORDENES).map(([id, o]) => (
              <option key={id} value={id}>{o.nombre}</option>
            ))}
          </select>
          <div className="flex min-w-0 gap-2">
            <button className="btn flex-1 px-3">Filtrar</button>
            {(filtrosActivos > 0 || q) && <Link href="/catalogo" className="btn-sec px-3" aria-label="Limpiar filtros">Limpiar</Link>}
          </div>
        </div>
        <details className="mt-2" open={filtrosActivos > 0}>
          <summary className="flex min-h-[48px] cursor-pointer items-center text-sm font-medium text-acopio-700">
            Más filtros{filtrosActivos > 0 ? ` (${filtrosActivos} activos)` : ""}
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Select name="categoria" vacio="Categoría" opciones={categorias.map((c) => ({ v: c.categoria, t: c.categoria }))} />
            <Select name="marca" vacio="Marca" opciones={marcas.map((c) => ({ v: c.marca, t: c.marca }))} />
            <Select name="formato" vacio="Formato" opciones={formatos.map((c) => ({ v: c.formato, t: c.formato }))} />
            <Select name="nicho" vacio="Tipo de negocio" opciones={NICHOS.map((n) => ({ v: n.id, t: n.nombre }))} />
            <Select name="objetivo" vacio="Objetivo" opciones={OBJETIVOS.map((o) => ({ v: o.id, t: o.nombre }))} />
            <input name="min" defaultValue={sp.min ?? ""} inputMode="numeric" placeholder="Precio desde" aria-label="Precio desde" className="campo" />
            <input name="max" defaultValue={sp.max ?? ""} inputMode="numeric" placeholder="Precio hasta" aria-label="Precio hasta" className="campo" />
          </div>
        </details>
      </form>

      <p className="mb-3 text-sm text-stone-600">{total} productos</p>
      {filas.length ? (
        <GrillaProductos productos={filas.map((f) => aTienda(f, cfg))} />
      ) : (
        <p className="rounded-2xl bg-white p-8 text-center text-stone-600 shadow-ficha">
          No encontramos productos con esos filtros. <Link href="/catalogo" className="underline">Ver todo el catálogo</Link>
        </p>
      )}
      {paginas > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-stone-600">Página {pagina} de {paginas}</span>
          <div className="flex gap-2">
            {pagina > 1 && <Link href={enlace(pagina - 1)} className="btn-sec">Anterior</Link>}
            {pagina < paginas && <Link href={enlace(pagina + 1)} className="btn-sec">Siguiente</Link>}
          </div>
        </div>
      )}
      {gondola && pagina === 1 && (
        <section className="mt-10 rounded-2xl bg-white p-5 shadow-ficha">
          <h2 className="font-display text-xl font-bold">{sp.categoria} por volumen, con envío</h2>
          <p className="mt-2 text-sm text-stone-700">{gondola.detalle}</p>
          <p className="mt-2 text-sm text-stone-700">Entregamos sin cargo en Villa Carlos Paz y el sur de Punilla, y despachamos por correo al resto del país. Compra mínima de {pesos(cfg.compraMinima)} por pedido, combinando las góndolas que quieras.</p>
        </section>
      )}
    </div>
  );
}
