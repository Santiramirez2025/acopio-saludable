import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { NICHOS, OBJETIVOS } from "@/lib/taxonomia";
import { pesos, precioPorUnidadBase } from "@/lib/precios";
import { guardarProducto } from "@/lib/acciones";
import { LineasHistorial } from "@/components/Graficos";

export default async function EditarProducto({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const codigo = decodeURIComponent((await params).codigo);
  const { ok, error } = await searchParams;
  const [p, cfg] = await Promise.all([
    prisma.product.findUnique({
      where: { codigo },
      include: { historial: { orderBy: { fecha: "desc" }, take: 120 }, comboItems: { include: { combo: true } } },
    }),
    leerConfig(),
  ]);
  if (!p) notFound();
  const margen = Number(p.margenPct);
  const porUnidad = precioPorUnidadBase(Number(p.precioPublico), p.contenido, p.unidad);

  return (
    <div className="space-y-4">
      <Link href="/admin/productos" className="text-sm text-stone-500 underline">← Productos</Link>
      <div>
        <h1 className="text-xl font-semibold">{p.producto}</h1>
        <p className="text-sm text-stone-500">
          <span className="font-mono">{p.codigo}</span> · {p.marca} · {p.presentacion} · {p.categoria} · {p.formato}
        </p>
      </div>
      {ok && <p className="rounded-md bg-acopio-100 px-3 py-2 text-sm text-acopio-700">Cambios guardados.</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">No se guardó: {error}</p>}
      {margen < cfg.margenMinimoPct && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Sin margen: {margen.toFixed(1)}% está por debajo del mínimo de {cfg.margenMinimoPct}%. No se publica en la tienda.
        </p>
      )}
      {!p.visible && p.ocultoMotivo && (
        <p className="rounded-md bg-stone-200 px-3 py-2 text-sm text-stone-700">Oculto: {p.ocultoMotivo}</p>
      )}

      <form action={guardarProducto} className="grid gap-4 lg:grid-cols-3">
        <input type="hidden" name="codigo" value={p.codigo} />
        <div className="tarjeta space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="etiqueta" htmlFor="costo">Costo</label>
              <input className="campo" id="costo" name="costo" inputMode="decimal" defaultValue={Number(p.costo).toFixed(2)} required />
            </div>
            <div>
              <label className="etiqueta" htmlFor="precioPublico">Precio público</label>
              <input className="campo" id="precioPublico" name="precioPublico" inputMode="decimal" defaultValue={Number(p.precioPublico).toFixed(2)} required />
            </div>
            <div>
              <label className="etiqueta" htmlFor="pesoBrutoG">Peso bruto (g){p.pesoEstimado && p.pesoBrutoG ? " · estimado" : ""}</label>
              <input className="campo" id="pesoBrutoG" name="pesoBrutoG" inputMode="numeric" defaultValue={p.pesoBrutoG ?? ""} placeholder="Falta cargar" />
            </div>
          </div>
          <p className="text-xs text-stone-500">
            Margen {margen.toFixed(1)}%{porUnidad ? ` · ${pesos(porUnidad.valor)} ${porUnidad.etiqueta}` : ""}
            {p.contenido ? ` · contenido ${p.contenido} ${p.unidad}` : " · sin contenido en el CSV"}
          </p>

          <fieldset>
            <legend className="etiqueta">Nichos</legend>
            <div className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-4">
              {NICHOS.map((n) => (
                <label key={n.id} className="flex items-center gap-2">
                  <input type="checkbox" name="nichos" value={n.id} defaultChecked={p.nichos.includes(n.id)} /> {n.nombre}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="etiqueta">Objetivos de bienestar</legend>
            <div className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-4">
              {OBJETIVOS.map((o) => (
                <label key={o.id} className="flex items-center gap-2">
                  <input type="checkbox" name="objetivos" value={o.id} defaultChecked={p.objetivos.includes(o.id)} /> {o.nombre}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="clasificacionRevisada" defaultChecked={p.clasificacionRevisada} />
            Clasificación revisada (deja de figurar como borrador automático)
          </label>

          <div>
            <label className="etiqueta" htmlFor="porQueLoElegimos">Por qué lo elegimos</label>
            <textarea className="campo" id="porQueLoElegimos" name="porQueLoElegimos" rows={3} defaultValue={p.porQueLoElegimos ?? ""}
              placeholder="Criterio de selección real. Sin promesas de salud, rendimiento ni descenso de peso." />
          </div>
        </div>

        <div className="space-y-4">
          <div className="tarjeta space-y-3">
            {p.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.fotoUrl} alt={p.producto} className="aspect-square w-full rounded object-cover" />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded bg-stone-100 text-sm text-stone-400">Sin foto</div>
            )}
            {p.fotos.length > 1 && (
              <div className="grid grid-cols-4 gap-1">
                {p.fotos.slice(1).map((f) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f} src={f} alt="" className="aspect-square w-full rounded object-cover" />
                ))}
              </div>
            )}
            <div>
              <label className="etiqueta" htmlFor="fotos">Fotos (una dirección por línea; la primera es la principal)</label>
              <textarea className="campo font-mono text-xs" id="fotos" name="fotos" rows={4} defaultValue={(p.fotos.length ? p.fotos : p.fotoUrl ? [p.fotoUrl] : []).join("\n")} placeholder="https://…" />
              <p className="mt-1 text-xs text-stone-500">Para subir imágenes nuevas usá Panel → Imágenes.</p>
            </div>
          </div>
          <div className="tarjeta space-y-3 text-sm">
            <div>
              <label className="etiqueta" htmlFor="estado">Estado</label>
              <select className="campo" id="estado" name="estado" defaultValue={p.estado}>
                <option value="ACTIVO">Activo</option>
                <option value="BORRADOR">Borrador</option>
                <option value="SIN_STOCK">Sin stock</option>
              </select>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" name="visible" defaultChecked={p.visible} /> Visible en la tienda</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="gancho" defaultChecked={p.gancho} /> Producto gancho</label>
            <button className="btn w-full">Guardar</button>
          </div>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="tarjeta">
          <h2 className="mb-2 text-sm font-semibold">Historial de precios</h2>
          <LineasHistorial puntos={[...p.historial].reverse().map((h) => ({ fecha: h.fecha, costo: Number(h.costo), precio: Number(h.precioPublico) }))} />
          <ul className="mt-3 text-sm">
            {p.historial.slice(0, 12).map((h) => (
              <li key={h.id} className="flex justify-between border-b border-stone-100 py-1 tabular-nums">
                <span className="text-stone-500">{h.fecha.toLocaleDateString("es-AR")} · {h.origen}</span>
                <span>costo {pesos(Number(h.costo))} · precio {pesos(Number(h.precioPublico))}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="tarjeta">
          <h2 className="mb-2 text-sm font-semibold">Combos que lo incluyen</h2>
          {p.comboItems.length ? (
            <ul className="text-sm">
              {p.comboItems.map((ci) => (
                <li key={ci.comboId} className="py-1">{ci.combo.nombre} × {ci.cantidad}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">Ninguno.</p>
          )}
        </div>
      </div>
    </div>
  );
}
