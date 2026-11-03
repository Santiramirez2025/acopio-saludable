// Cuánto sale el envío, dicho en el chat a partir de lo que escribe la persona («Carlos Paz»,
// «Nueva Córdoba», «Rosario»). El exacto se calcula en el checkout con el código postal; acá
// alcanza con un número honesto para que pueda decidir antes de pagar.

import { leerConfig } from "./config";
import { pesos } from "./precios";
import { cotizarConTabla, zonaPagaDe } from "./envios/tabla";
import { aplicarReglas } from "./envios/cotizar";
import type { EnvioCotizado } from "./asistente-catalogo";
import { zonaDeLugar } from "./envio-zona";
import { envioPropioPara, umbralZona, type ReglaMinimo } from "./minimo-zona";
export { zonaDeLugar } from "./envio-zona";

/**
 * El envío en la zona de reparto propio, según el subtotal: sin cargo desde el umbral de la zona; abajo,
 * el fijo configurado (si hay). Se recalcula cada vez que cambia el pedido, por eso vive aparte.
 */
export function envioZonaPropia(cfg: ReglaMinimo & { plazoEntregaPropia: string }, lugar: string, subtotal: number): EnvioCotizado {
  const fijo = envioPropioPara(cfg, subtotal);
  const umbral = umbralZona(cfg);
  if (fijo > 0) {
    return {
      lugar,
      costo: fijo,
      propia: true,
      zonaPropia: true,
      alRecibir: true,
      sinCargoDesde: umbral,
      detalle: `Envío a ${lugar}: ${pesos(fijo)} porque el pedido no llega a ${pesos(umbral)}; desde ${pesos(umbral)} va sin cargo. Te lo llevamos nosotros en ${cfg.plazoEntregaPropia}.`,
    };
  }
  return { lugar, costo: 0, propia: true, zonaPropia: true, alRecibir: true, detalle: `Envío a ${lugar}: sin cargo, te lo llevamos nosotros en ${cfg.plazoEntregaPropia}.` };
}

export async function cotizarEnvioChat(lugar: string, provincia: string | null, subtotal: number, kilos = 4): Promise<EnvioCotizado | null> {
  const cfg = await leerConfig();
  const zona = zonaDeLugar(lugar, provincia);
  if (!zona) return null;
  if (zona.tipo === "propia" && cfg.entregaPropiaActiva) return envioZonaPropia(cfg, lugar, subtotal);
  const zp = zonaPagaDe(cfg.tabla);
  if (zona.tipo === "capital" && cfg.entregaPropiaActiva && zp) {
    return { lugar, costo: zp.precio, propia: true, detalle: `Envío a ${lugar}: ${pesos(zp.precio)}, te lo llevamos nosotros${zp.plazo ? ` en ${zp.plazo}` : ""}.` };
  }
  const prov = zona.tipo === "correo" ? zona.provincia : "Córdoba";
  const tarifas = cotizarConTabla(cfg.tabla, prov, [{ pesoG: Math.round(Math.min(25, Math.max(0.5, kilos)) * 1000) + 100, unidades: 1, excedido: false }]);
  const opciones = aplicarReglas(tarifas, subtotal, cfg.envioGratisDesde);
  if (!opciones.length) return { lugar, costo: null, detalle: `Envío a ${lugar}: por correo, el costo exacto te aparece con tu código postal al pagar.` };
  const precio = opciones[0].precio;
  return {
    lugar,
    costo: precio,
    detalle: precio === 0 ? `Envío a ${lugar}: gratis por correo.` : `Envío a ${lugar}: por correo, aprox. ${pesos(precio)} (el exacto lo ves con tu código postal al pagar).`,
  };
}
