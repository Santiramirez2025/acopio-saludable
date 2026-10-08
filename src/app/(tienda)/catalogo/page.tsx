import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { wherePublicado } from "@/lib/filtros-producto";
import { aTienda } from "@/lib/tienda";
import { NICHOS, NICHO_IDS, OBJETIVOS, OBJETIVO_IDS } from "@/lib/taxonomia";
import { GrillaProductos, Titulo } from "@/components/Tienda";

export const metadata: Metadata = { title: "Catálogo", description: "Catálogo completo de productos saludables por volumen." };

const POR_PAGINA = 24;
const ORDENES: Record<string, { nombre: string; orderBy: Prisma.ProductOrderByWithRelationInput[] }> = {
  destacados: { nombre: "Destacados", orderBy: [{ gancho: "desc" }, { vendidos: "desc" }, { producto: "asc" }, { codigo: "asc" }] },
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
  const base = wherePublicado(cfg.margenMinimoPct);

  const where: Prisma.ProductWhereInput = {
    AND: [
      base,
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
      <Titulo>{q ? `Resultados para "${q}"` : sp.categoria || "Todo el catálogo"}</Titulo>
      <nav className="riel mb-3 md:mx-0 md:flex-wrap md:px-0" aria-label="Góndolas">
        <Link href="/catalogo" className={`chip shrink-0 px-3.5 py-2 text-sm ${!sp.categoria ? "bg-acopio-900 text-white" : "bg-white text-acopio-900 shadow-ficha"}`}>Todo</Link>
        {categorias.map((c) => (
          <Link key={c.categoria} href={`/catalogo?categoria=${encodeURIComponent(c.categoria)}`} className={`chip shrink-0 whitespace-nowrap px-3.5 py-2 text-sm ${sp.categoria === c.categoria ? "bg-acopio-900 text-white" : "bg-white text-acopio-900 shadow-ficha"}`}>{c.categoria}</Link>
        ))}
      </nav>
      <form action="/catalogo" className="mb-5 rounded-2xl bg-white p-3 shadow-ficha">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input name="q" defaultValue={q} placeholder="Buscar" aria-label="Buscar" className="campo col-span-2" />
          <select name="orden" defaultValue={orden} className="campo" aria-label="Ordenar por">
            {Object.entries(ORDENES).map(([id, o]) => (
              <option key={id} value={id}>{o.nombre}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button className="btn flex-1">Filtrar</button>
            <Link href="/catalogo" className="btn-sec">Limpiar</Link>
          </div>
        </div>
        <details className="mt-2" open={filtrosActivos > 0}>
          <summary className="cursor-pointer py-1 text-sm font-medium text-acopio-700">
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

      <p className="mb-3 text-sm text-stone-500">{total} productos</p>
      {filas.length ? (
        <GrillaProductos productos={filas.map(aTienda)} />
      ) : (
        <p className="rounded-2xl bg-white p-8 text-center text-stone-600 shadow-ficha">
          No encontramos productos con esos filtros. <Link href="/catalogo" className="underline">Ver todo el catálogo</Link>
        </p>
      )}
      {paginas > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-stone-500">Página {pagina} de {paginas}</span>
          <div className="flex gap-2">
            {pagina > 1 && <Link href={enlace(pagina - 1)} className="btn-sec">Anterior</Link>}
            {pagina < paginas && <Link href={enlace(pagina + 1)} className="btn-sec">Siguiente</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
