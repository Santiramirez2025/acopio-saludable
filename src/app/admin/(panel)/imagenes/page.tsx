import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { wherePublicado } from "@/lib/filtros-producto";
import { SubidorImagenes } from "@/components/SubidorImagenes";

const PROPIA = ".public.blob.vercel-storage.com/";

export default async function Imagenes() {
  const cfg = await leerConfig();
  const [todos, enCombos] = await Promise.all([
    prisma.product.findMany({ where: wherePublicado(cfg.margenMinimoPct), select: { codigo: true, producto: true, presentacion: true, categoria: true, fotoUrl: true, fotos: true, gancho: true, vendidos: true }, orderBy: [{ gancho: "desc" }, { vendidos: "desc" }, { producto: "asc" }] }),
    prisma.comboItem.findMany({ select: { codigo: true }, distinct: ["codigo"] }),
  ]);
  const codigos = await prisma.product.findMany({ select: { codigo: true } });
  const deCombo = new Set(enCombos.map((c) => c.codigo));
  const propias = (p: (typeof todos)[number]) => p.fotos.filter((f) => f.includes(PROPIA)).length;
  const conPropias = todos.filter((p) => propias(p) > 0).length;
  const sinNinguna = todos.filter((p) => !p.fotoUrl).length;
  // Prioridad: ganchos, productos de combos y pedidos tipo, más vendidos; primero los que no tienen imagen propia.
  const prioridad = todos
    .map((p) => ({ ...p, peso: (p.gancho ? 4 : 0) + (deCombo.has(p.codigo) ? 2 : 0) + (p.vendidos > 0 ? 1 : 0) + (!p.fotoUrl ? 3 : 0) }))
    .filter((p) => p.peso > 0 && propias(p) === 0)
    .sort((a, b) => b.peso - a.peso || b.vendidos - a.vendidos)
    .slice(0, 60);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Imágenes</h1>
        <p className="text-sm text-stone-500">
          {todos.length} productos publicados: {conPropias} con imagen propia, {todos.length - conPropias - sinNinguna} solo con la foto del proveedor, {sinNinguna} sin ninguna foto.
        </p>
      </div>
      {!process.env.BLOB_READ_WRITE_TOKEN && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">Para subir imágenes falta conectar un almacén Blob al proyecto en Vercel (Storage → Blob). Hasta entonces la subida no funciona.</p>
      )}
      <div className="tarjeta space-y-2">
        <h2 className="font-semibold">Subida masiva</h2>
        <p className="text-sm text-stone-500">Las imágenes propias pasan a ser las primeras de la galería del producto; la foto del proveedor queda al final. Cuadradas (1:1), de 1.200 px o más, para que se vean bien en la tienda.</p>
        <SubidorImagenes codigos={codigos.map((c) => c.codigo)} />
      </div>
      <div className="tarjeta">
        <h2 className="mb-1 font-semibold">Por dónde empezar</h2>
        <p className="mb-3 text-sm text-stone-500">Los {prioridad.length} productos donde una imagen mejor rinde más: ganchos, productos de combos y pedidos tipo, y los que no tienen ninguna foto.</p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {prioridad.map((p) => (
            <li key={p.codigo} className="flex items-center gap-3 rounded-xl border border-stone-200 p-2">
              {p.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.fotoUrl} alt="" loading="lazy" className="h-12 w-12 rounded object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded bg-red-50 text-[10px] font-semibold text-red-700">sin foto</span>
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/admin/productos/${encodeURIComponent(p.codigo)}`} className="block truncate text-sm font-medium hover:underline">{p.producto}</Link>
                <p className="truncate text-xs text-stone-500">{p.presentacion}</p>
                <p className="font-mono text-xs text-stone-600">{p.codigo}-1.png {p.gancho && <span className="chip bg-tierra-100 text-tierra-700">gancho</span>}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
