import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sincronizadoHoy } from "@/lib/sync";
import { guardarUmbral, subirActualizacion } from "@/lib/acciones";
import { GeneradorMarcador } from "@/components/GeneradorMarcador";

export default async function Actualizaciones({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const [hoy, cfg, corridas] = await Promise.all([
    sincronizadoHoy(),
    prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    prisma.priceSync.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { items: { select: { tipo: true, estado: true } } } }),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Actualizaciones de precios</h1>
      {hoy ? (
        <p className="rounded-md bg-acopio-100 px-3 py-2 text-sm text-acopio-700">Los precios de hoy ya están sincronizados.</p>
      ) : (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">Sincronizá los precios de hoy: abrí Distrimay con tu sesión y tocá el marcador.</p>
      )}
      {ok && <p className="rounded-md bg-acopio-100 px-3 py-2 text-sm text-acopio-700">Guardado.</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="tarjeta space-y-3 text-sm">
          <h2 className="font-semibold">Con un clic desde Distrimay</h2>
          <ol className="list-decimal space-y-1 pl-5 text-stone-700">
            <li>Generá el marcador y arrastralo a la barra de marcadores (una sola vez).</li>
            <li>Cada mañana entrá a <span className="font-mono text-xs">compras.distrimay.com</span> con tu usuario.</li>
            <li>Tocá el marcador. Lee costos y precios públicos y los manda acá.</li>
          </ol>
          <p className="text-stone-500">Con sesión iniciada lee tus costos y los precios públicos; sin sesión, solo los públicos. El marcador no lee ni guarda tu usuario ni tu contraseña de Distrimay.</p>
          <GeneradorMarcador hayToken={Boolean(cfg.syncTokenHash)} />
        </div>

        <div className="space-y-4">
          <form action={subirActualizacion} className="tarjeta space-y-3 text-sm">
            <h2 className="font-semibold">Subir un archivo</h2>
            <p className="text-stone-500">El <span className="font-mono text-xs">precios-distrimay.json</span> que descarga el marcador si no pudo enviar, o un CSV del proveedor con las columnas del catálogo (codigo, producto, marca, presentacion, categoria, formato, costo, precio_publico).</p>
            <input className="campo" type="file" name="archivo" accept=".json,.csv,application/json,text/csv" required />
            <button className="btn">Subir y ver cambios</button>
          </form>
          <form action={guardarUmbral} className="tarjeta flex flex-wrap items-end gap-3 text-sm">
            <div>
              <label className="etiqueta" htmlFor="umbralAutoPct">Aplicar solos los cambios menores a (%)</label>
              <input className="campo w-32" id="umbralAutoPct" name="umbralAutoPct" inputMode="decimal" defaultValue={Number(cfg.umbralAutoPct)} required />
            </div>
            <button className="btn-sec">Guardar</button>
            <p className="w-full text-xs text-stone-500">Los cambios iguales o mayores quedan esperando tu aprobación.</p>
          </form>
        </div>
      </div>

      <div className="tarjeta">
        <h2 className="mb-2 text-sm font-semibold">Últimas actualizaciones</h2>
        {corridas.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-stone-500">
              <tr><th className="py-1">Fecha</th><th className="py-1">Origen</th><th className="py-1 text-right">Leídos</th><th className="py-1 text-right">Cambios</th><th className="py-1 text-right">Nuevos</th><th className="py-1 text-right">Desaparecidos</th><th className="py-1 text-right">Pendientes</th></tr>
            </thead>
            <tbody>
              {corridas.map((c) => {
                const n = (f: (i: { tipo: string; estado: string }) => boolean) => c.items.filter(f).length;
                const pendientes = n((i) => i.estado === "PENDIENTE");
                return (
                  <tr key={c.id} className="border-t border-stone-100">
                    <td className="py-1.5"><Link href={`/admin/actualizaciones/${c.id}`} className="text-acopio-700 underline">{c.createdAt.toLocaleString("es-AR", { timeZone: "America/Argentina/Cordoba", dateStyle: "short", timeStyle: "short" })}</Link></td>
                    <td className="py-1.5">{c.origen} · {c.modo === "costos" ? "costos y públicos" : "solo públicos"}</td>
                    <td className="py-1.5 text-right tabular-nums">{c.recibidos}</td>
                    <td className="py-1.5 text-right tabular-nums">{n((i) => i.tipo === "CAMBIO")}</td>
                    <td className="py-1.5 text-right tabular-nums">{n((i) => i.tipo === "NUEVO")}</td>
                    <td className="py-1.5 text-right tabular-nums">{n((i) => i.tipo === "DESAPARECIDO")}</td>
                    <td className={`py-1.5 text-right tabular-nums ${pendientes ? "font-semibold text-amber-700" : ""}`}>{pendientes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-stone-500">Todavía no hubo ninguna actualización.</p>
        )}
      </div>
    </div>
  );
}
