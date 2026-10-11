// Orquestador de envíos: entrega propia + correos con credenciales; la tabla entra como respaldo.

import { cpEnLista, zonaDeProvincia } from "./geo";
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
  // Lo que vale cada opción para el cliente: el precio de lista si lo tiene, si no lo que nos cuesta.
  const lista = (t: Tarifa) => t.precioFijo ?? t.costo;
  const pagas = tarifas.filter((t) => lista(t) > 0);
  const minimoPago = pagas.length ? Math.min(...pagas.map(lista)) : 0;
  const gratis = envioGratisDesde !== null && subtotal >= envioGratisDesde;
  const opciones = tarifas.map((t) => ({
    ...t,
    // Con envío gratis, la opción paga más barata sale $0 y las demás pagan solo la diferencia.
    precio: gratis && lista(t) > 0 ? Math.max(0, Math.round((lista(t) - minimoPago) * 100) / 100) : lista(t),
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
  const plazoPropia = cfg.plazoEntregaPropia || "24 a 48 hs hábiles";
  const sinCargo = cfg.entregaPropiaActiva && cpEnLista(pedido.cpDestino, cfg.cpEntregaPropia);
  if (sinCargo) {
    tarifas.push({ id: "propia", proveedor: "propia", modalidad: "propia", nombre: "Entrega propia sin cargo", costo: 0, plazo: `Te lo llevamos en ${plazoPropia}. Coordinamos el horario por WhatsApp.` });
  }
  // La zona paga solo si no entró en la gratuita: nadie tiene que pagar por algo que le damos sin cargo.
  const paga = cfg.tabla.propiaPaga;
  if (cfg.entregaPropiaActiva && !sinCargo && paga && cpEnLista(pedido.cpDestino, paga.cps)) {
    tarifas.push({
      id: "propia-paga",
      proveedor: "propia",
      modalidad: "propia",
      nombre: "Te lo llevamos nosotros",
      costo: paga.costo ?? 0,
      precioFijo: paga.precio,
      plazo: `Te lo llevamos en ${paga.plazo || plazoPropia}. Coordinamos el horario por WhatsApp.`,
    });
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
  // Si el correo no informa días, usamos el plazo de la zona: el cliente siempre tiene que ver una ventana,
  // no un "a confirmar" que lo deja sin saber cuándo llega.
  const zona = zonaDeProvincia(pedido.provincia);
  const plazoZona = zona ? cfg.tabla.zonas[zona]?.plazo : null;
  const conDespacho = (t: Tarifa): Tarifa => {
    const dias = /confirmar/i.test(t.plazo) ? plazoZona : t.plazo;
    return { ...t, plazo: dias ? `${DESPACHO} + ${dias} de correo` : `${DESPACHO}. Plazo del correo a confirmar.` };
  };
  tarifas.push(...(deCorreos.length ? deCorreos : await proveedorTabla(cfg.tabla).cotizar(consulta)).map(conDespacho));
  return aplicarReglas(tarifas, pedido.subtotal, cfg.envioGratisDesde);
}
