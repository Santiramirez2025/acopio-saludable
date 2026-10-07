import { leerConfig } from "@/lib/config";
import { guardarConfig } from "@/lib/acciones";

const CAMPOS = [
  ["compraMinima", "Compra mínima por pedido ($)"],
  ["margenMinimoPct", "Margen mínimo (%)"],
  ["descuentoTransferenciaPct", "Descuento por transferencia (%)"],
  ["comisionPagoPct", "Comisión del medio de pago (%)"],
  ["costoPackaging", "Costo de packaging por pedido ($)"],
] as const;

export default async function Configuracion({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const cfg = await leerConfig();
  const { ok, error } = await searchParams;
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Configuración</h1>
      {ok && <p className="rounded-md bg-acopio-100 px-3 py-2 text-sm text-acopio-700">Configuración guardada.</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">No se guardó: {error}</p>}
      <form action={guardarConfig} className="tarjeta space-y-4">
        {CAMPOS.map(([id, label]) => (
          <div key={id}>
            <label className="etiqueta" htmlFor={id}>{label}</label>
            <input className="campo" id={id} name={id} inputMode="decimal" defaultValue={cfg[id]} required />
          </div>
        ))}
        <div>
          <label className="etiqueta" htmlFor="envioGratisDesde">Envío gratis desde ($)</label>
          <input className="campo" id="envioGratisDesde" name="envioGratisDesde" inputMode="decimal" defaultValue={cfg.envioGratisDesde ?? ""} placeholder="Vacío = sin envío gratis" />
        </div>
        <p className="text-xs text-stone-500">Bajar o subir el margen mínimo cambia al instante qué productos y combos se publican.</p>
        <button className="btn">Guardar</button>
      </form>
    </div>
  );
}
