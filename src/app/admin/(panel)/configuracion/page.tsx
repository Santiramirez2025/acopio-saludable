import { leerConfig } from "@/lib/config";
import { guardarConfig } from "@/lib/acciones";

const CAMPOS = [
  ["compraMinima", "Compra mínima por pedido ($)"],
  ["margenMinimoPct", "Margen mínimo (%)"],
  ["recargoPrecioPct", "Recargo sobre el precio base para el precio de lista (%). Cubre la comisión de Mercado Pago"],
  ["descuentoTransferenciaPct", "Descuento por transferencia (%). Igual al recargo = quien transfiere paga el precio base"],
  ["recargoSugeridoPct", "Recargo para el precio sugerido de reventa (%). 0 = no mostrarlo"],
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
        <hr className="border-stone-200" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etiqueta" htmlFor="corteDias">Días de compra al proveedor</label>
            <input className="campo" id="corteDias" name="corteDias" defaultValue={cfg.corteDias.join(",")} placeholder="1,2,3,4,5" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="corteHora">Hora de cierre (0 a 23)</label>
            <input className="campo" id="corteHora" name="corteHora" inputMode="numeric" defaultValue={cfg.corteHora} required />
          </div>
          <p className="col-span-2 text-xs text-stone-600">La tienda muestra una cuenta regresiva: «Pedí en X h y entra en la compra de hoy». Días: 1 = lunes … 6 = sábado, 0 = domingo, separados por coma. Poné solo los días y la hora que realmente cumplís; vacío = no se muestra.</p>
        </div>
        <hr className="border-stone-200" />
        <div>
          <label className="etiqueta" htmlFor="whatsapp">WhatsApp de la tienda (con código de área)</label>
          <input className="campo" id="whatsapp" name="whatsapp" type="tel" defaultValue={cfg.whatsapp ?? ""} placeholder="Para que el cliente mande el comprobante" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="emailContacto">Email de contacto</label>
          <input className="campo" id="emailContacto" name="emailContacto" type="email" defaultValue={cfg.emailContacto ?? ""} placeholder="Recibe el aviso de cada pedido nuevo" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="transferenciaDatos">Datos para transferencia</label>
          <textarea className="campo" id="transferenciaDatos" name="transferenciaDatos" rows={4} defaultValue={cfg.transferenciaDatos ?? ""} placeholder={"Titular, CUIT, banco, CBU y alias. Se muestran al cliente que elige transferencia."} />
        </div>
        <p className="text-xs text-stone-600">Bajar o subir el margen mínimo cambia al instante qué productos y combos se publican.</p>
        <button className="btn">Guardar</button>
      </form>
    </div>
  );
}
