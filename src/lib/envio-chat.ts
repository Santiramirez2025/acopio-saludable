// Cuánto sale el envío, dicho en el chat a partir de lo que escribe la persona («Carlos Paz»,
// «Nueva Córdoba», «Rosario»). El exacto se calcula en el checkout con el código postal; acá
// alcanza con un número honesto para que pueda decidir antes de pagar.

import { leerConfig } from "./config";
import { pesos } from "./precios";
import { cotizarConTabla, zonaPagaDe } from "./envios/tabla";
import { aplicarReglas } from "./envios/cotizar";
import type { EnvioCotizado } from "./asistente-catalogo";
import { zonaDeLugar } from "./envio-zona";
export { zonaDeLugar } from "./envio-zona";

export async function cotizarEnvioChat(lugar: string, provincia: string | null, subtotal: number): Promise<EnvioCotizado | null> {
  const cfg = await leerConfig();
  const zona = zonaDeLugar(lugar, provincia);
  if (!zona) return null;
  if (zona.tipo === "propia" && cfg.entregaPropiaActiva) {
    return { lugar, costo: 0, detalle: `Envío a ${lugar}: sin cargo, te lo llevamos nosotros en ${cfg.plazoEntregaPropia}.` };
  }
  const zp = zonaPagaDe(cfg.tabla);
  if (zona.tipo === "capital" && cfg.entregaPropiaActiva && zp) {
    return { lugar, costo: zp.precio, detalle: `Envío a ${lugar}: ${pesos(zp.precio)}, te lo llevamos nosotros${zp.plazo ? ` en ${zp.plazo}` : ""}.` };
  }
  const prov = zona.tipo === "correo" ? zona.provincia : "Córdoba";
  const tarifas = cotizarConTabla(cfg.tabla, prov, [{ pesoG: 4000, unidades: 1, excedido: false }]);
  const opciones = aplicarReglas(tarifas, subtotal, cfg.envioGratisDesde);
  if (!opciones.length) return { lugar, costo: null, detalle: `Envío a ${lugar}: por correo, el costo exacto te aparece con tu código postal al pagar.` };
  const precio = opciones[0].precio;
  return {
    lugar,
    costo: precio,
    detalle: precio === 0 ? `Envío a ${lugar}: gratis por correo.` : `Envío a ${lugar}: por correo, aprox. ${pesos(precio)} (el exacto lo ves con tu código postal al pagar).`,
  };
}
