import { leerConfig } from "@/lib/config";
import { ZONAS } from "@/lib/envios/geo";
import { proveedorMiCorreo } from "@/lib/envios/micorreo";
import { proveedorAndreani } from "@/lib/envios/andreani";
import { guardarEnvios } from "@/lib/acciones";

export default async function Envios({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [cfg, { ok, error }] = await Promise.all([leerConfig(), searchParams]);
  const t = cfg.tabla;
  const correos = [
    ["MiCorreo (Correo Argentino)", proveedorMiCorreo.configurado(), "MICORREO_USER, MICORREO_PASSWORD, MICORREO_CUSTOMER_ID"],
    ["Andreani", proveedorAndreani.configurado(), "ANDREANI_USER, ANDREANI_PASSWORD, ANDREANI_CLIENTE y un contrato"],
  ] as const;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Envíos</h1>
      {ok && <p className="rounded-md bg-acopio-100 px-3 py-2 text-sm text-acopio-700">Envíos guardados.</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">No se guardó: {error}</p>}
      {!cfg.tablaEnviosRevisada && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          La tabla tiene <b>valores de ejemplo</b>, no tarifas reales. Mientras no haya un correo conectado, esto es lo que se le cobra al cliente: cargá tus tarifas y marcá la tabla como revisada.
        </p>
      )}
      <div className="tarjeta text-sm">
        <h2 className="mb-2 font-semibold">Correos conectados</h2>
        <ul className="space-y-1">
          {correos.map(([nombre, activo, variables]) => (
            <li key={nombre}>
              <span className={`chip ${activo ? "bg-acopio-100 text-acopio-700" : "bg-stone-200 text-stone-600"}`}>{activo ? "Conectado" : "Sin credenciales"}</span> {nombre}
              {!activo && <span className="text-stone-500"> · variables de entorno: {variables}</span>}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-stone-500">Con un correo conectado se usa su cotización en vivo. La tabla de abajo queda como respaldo si no hay credenciales o la API no responde.</p>
      </div>

      <form action={guardarEnvios} className="space-y-4">
        <div className="tarjeta grid gap-4 sm:grid-cols-3">
          <div>
            <label className="etiqueta" htmlFor="cpOrigen">Código postal de origen</label>
            <input className="campo" id="cpOrigen" name="cpOrigen" defaultValue={cfg.cpOrigen} required />
          </div>
          <div className="sm:col-span-2">
            <label className="etiqueta" htmlFor="cpEntregaPropia">Entrega propia sin cargo en estos códigos postales</label>
            <input className="campo" id="cpEntregaPropia" name="cpEntregaPropia" defaultValue={cfg.cpEntregaPropia} placeholder="5152, 5000-5022" />
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="entregaPropiaActiva" defaultChecked={cfg.entregaPropiaActiva} /> Ofrecer entrega propia</label>
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
          <p className="text-xs text-stone-500">Si cambiás la cantidad de tramos, guardá y volvé a completar los precios. Un bulto más pesado que el último tramo se cobra en proporción.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-stone-500">
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
