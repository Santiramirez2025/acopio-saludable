import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { margenPct, pesos } from "@/lib/precios";
import { resolverCambios } from "@/lib/acciones";

const TIPOS: Record<string, string> = { CAMBIO: "Cambio de precio", NUEVO: "Nuevo (en borrador)", DESAPARECIDO: "Desapareció (sin stock)", REAPARECIDO: "Volvió a estar" };

export default async function DetalleActualizacion({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ resumen?: string; error?: string }> }) {
  const { id } = await params;
  const { resumen, error } = await searchParams;
  const [sync, cfg] = await Promise.all([/^\d+$/.test(id) ? prisma.priceSync.findUnique({ where: { id: Number(id) }, include: { items: true } }) : null, leerConfig()]);
  if (!sync) notFound();
  // Primero lo que espera aprobación; dentro de cada grupo, los cambios más grandes arriba.
  const orden = { PENDIENTE: 0, APLICADO: 1, RECHAZADO: 2 };
  const items = [...sync.items].sort((a, b) => orden[a.estado] - orden[b.estado] || Math.abs(Number(b.pct ?? 0)) - Math.abs(Number(a.pct ?? 0)) || a.producto.localeCompare(b.producto, "es"));
  const pendientes = items.filter((i) => i.estado === "PENDIENTE").length;
  const cambios = items.filter((i) => i.tipo === "CAMBIO");
  const subas = cambios.filter((i) => Number(i.pct) > 0).length;
  const quedanSinMargen = cambios.filter((i) => i.estado !== "RECHAZADO" && margenPct(Number(i.precioNuevo), Number(i.costoNuevo)) < cfg.margenMinimoPct).length;
  const pct = (antes: unknown, nuevo: unknown) => {
    const a = Number(antes), n = Number(nuevo);
    if (antes === null || nuevo === null || a === n) return null;
    const v = a > 0 ? ((n - a) / a) * 100 : 100;
    return <span className={v > 0 ? "text-red-700" : "text-acopio-700"}>{v > 0 ? "▲" : "▼"} {Math.abs(v).toFixed(1)}%</span>;
  };

  return (
    <div className="space-y-4">
      <Link href="/admin/actualizaciones" className="text-sm text-stone-500 underline">← Actualizaciones</Link>
      <div>
        <h1 className="text-xl font-semibold">Actualización del {sync.createdAt.toLocaleString("es-AR", { timeZone: "America/Argentina/Cordoba", dateStyle: "short", timeStyle: "short" })}</h1>
        <p className="text-sm text-stone-500">
          {sync.origen} · {sync.modo === "costos" ? "costos y precios públicos" : "solo precios públicos"} · {sync.recibidos} productos leídos · {sync.completo ? "lectura completa" : "lectura parcial"}
        </p>
      </div>
      {resumen && <p className="rounded-md bg-acopio-100 px-3 py-2 text-sm text-acopio-700">{resumen}</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {sync.nota && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{sync.nota}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Subas", subas], ["Bajas", cambios.length - subas], ["Nuevos", items.filter((i) => i.tipo === "NUEVO").length],
          ["Desaparecidos", items.filter((i) => i.tipo === "DESAPARECIDO").length], ["Esperan aprobación", pendientes], ["Quedan sin margen", quedanSinMargen],
        ].map(([t, n]) => (
          <div key={t} className="tarjeta"><div className="text-2xl font-semibold tabular-nums">{n}</div><div className="text-xs text-stone-500">{t}</div></div>
        ))}
      </div>

      {!items.length ? (
        <p className="tarjeta text-sm text-stone-600">Sin cambios: todos los precios leídos coinciden con los cargados.</p>
      ) : (
        <form action={resolverCambios} className="space-y-3">
          <input type="hidden" name="syncId" value={sync.id} />
          {pendientes > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
              <span className="mr-auto font-medium text-amber-900">{pendientes} cambios esperan tu decisión. Hasta que no los apruebes, la tienda sigue con el precio anterior.</span>
              <button name="accion" value="aprobar" className="btn">Aprobar marcados</button>
              <button name="accion" value="rechazar" className="btn-sec">Rechazar marcados</button>
              <button name="accion" value="aprobar-todos" className="btn-sec">Aprobar todos</button>
            </div>
          )}
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr><th className="px-3 py-2"> </th><th className="px-3 py-2">Producto</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2 text-right">Costo</th><th className="px-3 py-2 text-right">Precio público</th><th className="px-3 py-2 text-right">Margen nuevo</th><th className="px-3 py-2">Estado</th></tr>
              </thead>
              <tbody>
                {items.slice(0, 600).map((i) => {
                  const margen = i.costoNuevo !== null && i.precioNuevo !== null ? margenPct(Number(i.precioNuevo), Number(i.costoNuevo)) : null;
                  return (
                    <tr key={i.id} className="border-t border-stone-100 align-top">
                      <td className="px-3 py-2">{i.estado === "PENDIENTE" && <input type="checkbox" name="ids" value={i.id} defaultChecked aria-label={`Marcar ${i.producto}`} />}</td>
                      <td className="px-3 py-2"><Link href={`/admin/productos/${encodeURIComponent(i.codigo)}`} className="hover:underline">{i.producto}</Link><div className="font-mono text-xs text-stone-400">{i.codigo}</div></td>
                      <td className="px-3 py-2">{TIPOS[i.tipo] ?? i.tipo}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{i.costoAntes !== null && <span className="text-stone-400">{pesos(Number(i.costoAntes))} → </span>}{i.costoNuevo !== null ? pesos(Number(i.costoNuevo)) : "—"}<div className="text-xs">{pct(i.costoAntes, i.costoNuevo)}</div></td>
                      <td className="px-3 py-2 text-right tabular-nums">{i.precioAntes !== null && <span className="text-stone-400">{pesos(Number(i.precioAntes))} → </span>}{i.precioNuevo !== null ? pesos(Number(i.precioNuevo)) : "—"}<div className="text-xs">{pct(i.precioAntes, i.precioNuevo)}</div></td>
                      <td className={`px-3 py-2 text-right tabular-nums ${margen !== null && margen < cfg.margenMinimoPct ? "font-semibold text-red-600" : ""}`}>{margen !== null ? `${margen.toFixed(1)}%` : "—"}</td>
                      <td className="px-3 py-2"><span className={`chip ${i.estado === "PENDIENTE" ? "bg-amber-100 text-amber-800" : i.estado === "RECHAZADO" ? "bg-stone-200 text-stone-600" : "bg-acopio-100 text-acopio-700"}`}>{i.estado === "PENDIENTE" ? "Espera aprobación" : i.estado === "RECHAZADO" ? "Rechazado" : "Aplicado"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {items.length > 600 && <p className="text-xs text-stone-500">Se muestran los 600 cambios más relevantes de {items.length}.</p>}
        </form>
      )}
    </div>
  );
}
