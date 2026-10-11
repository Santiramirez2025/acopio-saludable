import Link from "next/link";
import { leerConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { wherePublicado } from "@/lib/filtros-producto";
import { PESO_POR_DEFECTO_G } from "@/lib/envios/bultos";
import { probarCorreos } from "@/lib/envios/diagnostico";
import { ZONAS } from "@/lib/envios/geo";
import { CORREOS } from "@/lib/envios/tabla";
import { proveedorMiCorreo } from "@/lib/envios/micorreo";
import { proveedorAndreani } from "@/lib/envios/andreani";
import { guardarEnvios } from "@/lib/acciones";

export default async function Envios({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; probar?: string }> }) {
  const [cfg, { ok, error, probar }] = await Promise.all([leerConfig(), searchParams]);
  const t = cfg.tabla;
  const correos = [
    ["MiCorreo (Correo Argentino)", proveedorMiCorreo.configurado(), "MICORREO_USER, MICORREO_PASSWORD, MICORREO_CUSTOMER_ID"],
    ["Andreani", proveedorAndreani.configurado(), "ANDREANI_USER, ANDREANI_PASSWORD, ANDREANI_CLIENTE y un contrato"],
  ] as const;
  const hayCredenciales = correos.some(([, activo]) => activo);
  const pruebas = probar === "1" && hayCredenciales ? await probarCorreos() : null;
  // Un producto sin peso cotiza con el peso por defecto: si pesa mas, la diferencia la pagamos nosotros.
  const sinPeso = await prisma.product.count({ where: { AND: [wherePublicado(cfg.margenMinimoPct), { pesoBrutoG: null }] } });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Envíos</h1>
      {ok && <p className="rounded-md bg-acopio-100 px-3 py-2 text-sm text-acopio-700">Envíos guardados.</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">No se guardó: {error}</p>}
      {sinPeso > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Hay <b>{sinPeso} productos publicados sin peso cargado</b>. El envío se les cotiza asumiendo {PESO_POR_DEFECTO_G / 1000} kg por unidad: si pesan más, la diferencia la pagás vos.{" "}
          <Link href="/admin/productos?vista=sin-peso" className="underline">Cargarles el peso</Link>
        </p>
      )}
      {!cfg.tablaEnviosRevisada && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          La tabla es una <b>estimación</b> armada con tarifas publicadas de Correo Argentino (octubre 2026), no las de tu contrato. Mientras no haya un correo conectado, esto es lo que se le cobra al cliente: revisala, ajustala y marcala como revisada.
        </p>
      )}
      <div className="tarjeta text-sm">
        <h2 className="mb-2 font-semibold">Correos conectados</h2>
        <ul className="space-y-1">
          {correos.map(([nombre, activo, variables]) => (
            <li key={nombre}>
              <span className={`chip ${activo ? "bg-acopio-100 text-acopio-700" : "bg-stone-200 text-stone-600"}`}>{activo ? "Conectado" : "Sin credenciales"}</span> {nombre}
              {!activo && <span className="text-stone-600"> · variables de entorno: {variables}</span>}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-stone-600">Con un correo conectado se usa su cotización en vivo. La tabla de abajo queda como respaldo si no hay credenciales o la API no responde.</p>
        {hayCredenciales ? (
          <>
            {/* La tienda se cae a la tabla sin avisar: esta prueba es la única forma de saber si el correo contesta. */}
            <Link href="/admin/envios?probar=1" prefetch={false} className="btn-sec mt-3">Probar la conexión</Link>
            {pruebas && (
              <ul className="mt-3 space-y-2">
                {pruebas.length === 0 && <li className="text-stone-600">No hay ningún correo con credenciales para probar.</li>}
                {pruebas.map((p) => (
                  <li key={`${p.proveedor}-${p.destino}`} className={`rounded-md px-3 py-2 ${p.ok ? "bg-acopio-100 text-acopio-700" : "bg-red-50 text-red-700"}`}>
                    <b>{p.ok ? "Cotiza" : "Falla"} · {p.proveedor} · {p.destino}</b>
                    <span className="mt-0.5 block break-words font-mono text-xs">{p.detalle}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-2 text-stone-600">Cargá las variables en Vercel (Settings → Environment Variables, entorno Production) y volvé a desplegar: las variables de entorno no se leen hasta el despliegue siguiente.</p>
        )}
      </div>

      <form action={guardarEnvios} className="space-y-4">
        <div className="tarjeta grid gap-4 sm:grid-cols-3">
          <div>
            <label className="etiqueta" htmlFor="cpOrigen">Código postal de origen</label>
            <input className="campo" id="cpOrigen" name="cpOrigen" defaultValue={cfg.cpOrigen} required />
          </div>
          <div>
            <label className="etiqueta" htmlFor="plazoEntregaPropia">Plazo de la entrega propia (se muestra en la tienda)</label>
            <input className="campo" id="plazoEntregaPropia" name="plazoEntregaPropia" defaultValue={cfg.plazoEntregaPropia} placeholder="24 a 48 hs hábiles" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="correo">Correo que hace estos envíos</label>
            <select className="campo" id="correo" name="correo" defaultValue={t.correo ?? ""}>
              <option value="">Sin especificar</option>
              {CORREOS.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-stone-600">Le pone nombre a la opción que ve el cliente y arma el link de seguimiento.</p>
          </div>
          <div>
            <label className="etiqueta" htmlFor="seguroEnvioPct">Seguro del correo (% del valor del pedido)</label>
            <input className="campo" id="seguroEnvioPct" name="seguroPct" type="number" step="0.01" min="0" max="100" defaultValue={t.seguroPct ?? 0} />
            <p className="mt-1 text-xs text-stone-600">Se suma al envío porque depende del precio del pedido, no del peso. Andreani cobra ~1,21%. Dejalo en 0 si la tabla ya lo incluye.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="etiqueta" htmlFor="cpEntregaPropia">Entrega propia sin cargo en estos códigos postales</label>
            <input className="campo" id="cpEntregaPropia" name="cpEntregaPropia" defaultValue={cfg.cpEntregaPropia} placeholder="5152, 5153" />
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="entregaPropiaActiva" defaultChecked={cfg.entregaPropiaActiva} /> Ofrecer entrega propia</label>
          </div>
          <div className="sm:col-span-3">
            <h3 className="mb-1 font-semibold">Entrega propia con cargo</h3>
            <p className="mb-2 text-xs text-stone-600">Zona a la que llegás vos y cobrás. Los correos cobran lo mismo por 36 km que por 700, así que acá ganás vos. Dejá los códigos postales vacíos para apagarla.</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="etiqueta" htmlFor="propiaPagaCps">Códigos postales</label>
                <input className="campo" id="propiaPagaCps" name="propiaPagaCps" defaultValue={t.propiaPaga?.cps ?? ""} placeholder="5000-5025" />
              </div>
              <div>
                <label className="etiqueta" htmlFor="propiaPagaPrecio">Precio que cobrás</label>
                <input className="campo" id="propiaPagaPrecio" name="propiaPagaPrecio" type="number" min="0" step="1" defaultValue={t.propiaPaga?.precio ?? 0} />
              </div>
              <div>
                <label className="etiqueta" htmlFor="propiaPagaCosto">Lo que te cuesta el viaje</label>
                <input className="campo" id="propiaPagaCosto" name="propiaPagaCosto" type="number" min="0" step="1" defaultValue={t.propiaPaga?.costo ?? 0} />
                <p className="mt-1 text-xs text-stone-600">Nafta y tiempo. Solo para que el margen del panel sea real; el cliente no lo ve.</p>
              </div>
            </div>
            <div className="mt-3 sm:w-1/2">
              <label className="etiqueta" htmlFor="propiaPagaPlazo">Plazo de esta zona</label>
              <input className="campo" id="propiaPagaPlazo" name="propiaPagaPlazo" defaultValue={t.propiaPaga?.plazo ?? ""} placeholder={cfg.plazoEntregaPropia} />
            </div>
          </div>
        </div>

        <div className="tarjeta space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-semibold">Tabla por peso y zona (precio por bulto, en $)</h2>
            <div>
              <label className="etiqueta" htmlFor="tramosKg">Tramos: hasta … kg</label>
              <input className="campo w-56" id="tramosKg" name="tramosKg" defaultValue={t.tramosKg.join(", ")} />
            </div>
          </div>
          <p className="text-xs text-stone-600">Si cambiás la cantidad de tramos, guardá y volvé a completar los precios. Un bulto más pesado que el último tramo se cobra en proporción.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-stone-600">
                <tr><th className="py-1 pr-2">Zona</th><th className="py-1 pr-2">Modalidad</th>{t.tramosKg.map((kg) => <th key={kg} className="py-1 pr-2">Hasta {kg} kg</th>)}<th className="py-1">Plazo</th></tr>
              </thead>
              <tbody>
                {ZONAS.map((z) =>
                  (["sucursal", "domicilio"] as const).map((tipo, k) => (
                    <tr key={`${z.id}-${tipo}`} className={k === 0 ? "border-t border-stone-200" : ""}>
                      <td className="py-1 pr-2 font-medium">{k === 0 ? z.nombre : ""}</td>
                      <td className="py-1 pr-2 text-stone-600">{tipo === "sucursal" ? "A sucursal" : "A domicilio"}</td>
                      {t.tramosKg.map((_, i) => (
                        <td key={i} className="py-1 pr-2"><input className="campo w-24 px-2 py-1" name={`${z.id}.${tipo}.${i}`} inputMode="numeric" defaultValue={t.zonas[z.id][tipo][i]} aria-label={`${z.nombre} ${tipo} tramo ${i + 1}`} required /></td>
                      ))}
                      <td className="py-1">{k === 0 && <input className="campo w-44 px-2 py-1" name={`${z.id}.plazo`} defaultValue={t.zonas[z.id].plazo} aria-label={`Plazo ${z.nombre}`} />}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="tablaEnviosRevisada" defaultChecked={cfg.tablaEnviosRevisada} /> Revisé la tabla: son mis tarifas reales</label>
        </div>
        <button className="btn">Guardar envíos</button>
      </form>
    </div>
  );
}
