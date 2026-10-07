import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { VISTAS, whereVista } from "@/lib/filtros-producto";
import { pesos } from "@/lib/precios";
import { alternarProducto } from "@/lib/acciones";

const POR_PAGINA = 50;
type SP = { q?: string; vista?: string; categoria?: string; pagina?: string };

export default async function Productos({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const cfg = await leerConfig();
  const q = (sp.q ?? "").trim();
  const vista = sp.vista ?? "todos";
  const categoria = sp.categoria ?? "";
  const pagina = Math.max(1, Number.parseInt(sp.pagina ?? "1", 10) || 1);

  const where: Prisma.ProductWhereInput = {
    AND: [
      whereVista(vista, cfg.margenMinimoPct),
      categoria ? { categoria } : {},
      q
        ? {
            OR: [
              { codigo: { contains: q } },
              { producto: { contains: q, mode: "insensitive" } },
              { marca: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };
  const [total, productos, categorias] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy: [{ categoria: "asc" }, { producto: "asc" }, { codigo: "asc" }], skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA }),
    prisma.product.findMany({ distinct: ["categoria"], select: { categoria: true }, orderBy: { categoria: "asc" } }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlace = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (vista !== "todos") u.set("vista", vista);
    if (categoria) u.set("categoria", categoria);
    if (p > 1) u.set("pagina", String(p));
    return `/admin/productos?${u}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Productos <span className="text-sm font-normal text-stone-500">({total})</span>
        </h1>
        <form className="flex flex-wrap gap-2" action="/admin/productos">
          <input className="campo w-56" name="q" defaultValue={q} placeholder="Código, producto o marca" />
          <select className="campo w-48" name="vista" defaultValue={vista}>
            {VISTAS.map((v) => (
              <option key={v.id} value={v.id}>{v.nombre}</option>
            ))}
          </select>
          <select className="campo w-48" name="categoria" defaultValue={categoria}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.categoria}>{c.categoria}</option>
            ))}
          </select>
          <button className="btn">Filtrar</button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">Foto</th>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2 text-right">Costo</th>
              <th className="px-3 py-2 text-right">Precio</th>
              <th className="px-3 py-2 text-right">Margen</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => {
              const margen = Number(p.margenPct);
              const sinMargen = margen < cfg.margenMinimoPct;
              return (
                <tr key={p.codigo} className="border-t border-stone-100 align-top">
                  <td className="px-3 py-2">
                    {p.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.fotoUrl} alt="" loading="lazy" className="h-12 w-12 rounded object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-stone-100 text-[10px] text-stone-400">sin foto</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/productos/${encodeURIComponent(p.codigo)}`} className="font-medium hover:underline">{p.producto}</Link>
                    <div className="text-xs text-stone-500">{p.marca} · {p.presentacion}</div>
                    <div className="text-xs text-stone-400">{p.categoria}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{p.codigo}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pesos(Number(p.costo))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pesos(Number(p.precioPublico))}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${sinMargen ? "font-semibold text-red-600" : ""}`}>{margen.toFixed(1)}%</td>
                  <td className="space-y-1 px-3 py-2">
                    {sinMargen && <span className="chip bg-red-100 text-red-700">Sin margen</span>}
                    {!p.visible && <span className="chip bg-stone-200 text-stone-700" title={p.ocultoMotivo ?? ""}>Oculto</span>}
                    {p.estado !== "ACTIVO" && <span className="chip bg-amber-100 text-amber-800">{p.estado === "BORRADOR" ? "Borrador" : "Sin stock"}</span>}
                    {p.visible && !sinMargen && p.estado === "ACTIVO" && <span className="chip bg-acopio-100 text-acopio-700">Publicado</span>}
                    {p.gancho && <span className="chip bg-tierra-100 text-tierra-500">Gancho</span>}
                    {!p.visible && p.ocultoMotivo && <div className="max-w-[14rem] text-xs text-stone-400">{p.ocultoMotivo}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col items-start gap-1">
                      {(["visible", "gancho"] as const).map((campo) => (
                        <form key={campo} action={alternarProducto}>
                          <input type="hidden" name="codigo" value={p.codigo} />
                          <input type="hidden" name="campo" value={campo} />
                          <button className="text-xs text-acopio-700 underline">
                            {campo === "visible" ? (p.visible ? "Ocultar" : "Mostrar") : p.gancho ? "Quitar gancho" : "Marcar gancho"}
                          </button>
                        </form>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!productos.length && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-stone-500">No hay productos con esos filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-500">Página {pagina} de {paginas}</span>
        <div className="flex gap-2">
          {pagina > 1 && <Link className="btn-sec" href={enlace(pagina - 1)}>Anterior</Link>}
          {pagina < paginas && <Link className="btn-sec" href={enlace(pagina + 1)}>Siguiente</Link>}
        </div>
      </div>
    </div>
  );
}
