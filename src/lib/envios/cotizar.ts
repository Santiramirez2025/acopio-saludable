// Orquestador de envíos: entrega propia + correos con credenciales; la tabla entra como respaldo.

import { cpEnLista } from "./geo";
import { proveedorAndreani } from "./andreani";
import { proveedorMiCorreo } from "./micorreo";
import { proveedorTabla, type TablaEnvios } from "./tabla";
import type { Bulto, OpcionEnvio, ShippingProvider, Tarifa } from "./tipos";

export const DESPACHO = "Despacho en 24 a 48 hs hábiles";

export type ConfigEnvio = {
  cpOrigen: string;
  entregaPropiaActiva: boolean;
  cpEntregaPropia: string;
  plazoEntregaPropia?: string;
  envioGratisDesde: number | null;
  tabla: TablaEnvios;
};

/** Reglas comerciales sobre las tarifas: envío gratis desde $X y marca de la más barata. */
export function aplicarReglas(tarifas: Tarifa[], subtotal: number, envioGratisDesde: number | null): OpcionEnvio[] {
  const pagas = tarifas.filter((t) => t.modalidad !== "propia");
  const minimoPago = pagas.length ? Math.min(...pagas.map((t) => t.costo)) : 0;
  const gratis = envioGratisDesde !== null && subtotal >= envioGratisDesde;
  const opciones = tarifas.map((t) => ({
    ...t,
    // Con envío gratis, la opción paga más barata sale $0 y las demás pagan solo la diferencia.
    precio: t.modalidad === "propia" ? 0 : gratis ? Math.round((t.costo - minimoPago) * 100) / 100 : t.costo,
    masBarata: false,
  }));
  const minimo = Math.min(...opciones.map((o) => o.precio));
  const elegida = opciones.find((o) => o.precio === minimo);
  if (elegida) elegida.masBarata = true;
  return opciones.sort((a, b) => a.precio - b.precio);
}

export async function cotizarEnvio(
  cfg: ConfigEnvio,
  pedido: { cpDestino: string; provincia: string; bultos: Bulto[]; subtotal: number },
  proveedores: ShippingProvider[] = [proveedorMiCorreo, proveedorAndreani],
): Promise<OpcionEnvio[]> {
  const tarifas: Tarifa[] = [];
  if (cfg.entregaPropiaActiva && cpEnLista(pedido.cpDestino, cfg.cpEntregaPropia)) {
    tarifas.push({ id: "propia", proveedor: "propia", modalidad: "propia", nombre: "Entrega propia sin cargo", costo: 0, plazo: `Te lo llevamos en ${cfg.plazoEntregaPropia || "24 a 48 hs hábiles"}. Coordinamos el horario por WhatsApp.` });
  }
  const consulta = { cpOrigen: cfg.cpOrigen, cpDestino: pedido.cpDestino, provincia: pedido.provincia, bultos: pedido.bultos, valorDeclarado: pedido.subtotal };
  const deCorreos = (
    await Promise.all(
      proveedores
        .filter((p) => p.configurado())
        .map((p) =>
          p.cotizar(consulta).catch((e) => {
            console.error(`Envíos: falló ${p.id}`, e);
            return [] as Tarifa[];
          }),
        ),
    )
  ).flat();
  // Sin credenciales, o si las APIs no respondieron: tabla por peso y zona.
  // Al plazo del correo se le suma el despacho: compramos la mercadería para cada pedido.
  const conDespacho = (t: Tarifa): Tarifa => ({ ...t, plazo: /confirmar/i.test(t.plazo) ? `${DESPACHO}. Plazo del correo a confirmar.` : `${DESPACHO} + ${t.plazo} de correo` });
  tarifas.push(...(deCorreos.length ? deCorreos : await proveedorTabla(cfg.tabla).cotizar(consulta)).map(conDespacho));
  return aplicarReglas(tarifas, pedido.subtotal, cfg.envioGratisDesde);
}
