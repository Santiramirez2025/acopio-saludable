// Tabla de envíos por peso y zona: el respaldo cuando no hay credenciales de un correo o su API falla.

import { ZONAS, zonaDeProvincia, type ZonaId } from "./geo";
import type { Bulto, PedidoCotizacion, ShippingProvider, Tarifa } from "./tipos";

export type FilaZona = { sucursal: number[]; domicilio: number[]; plazo: string };
export type TablaEnvios = { tramosKg: number[]; zonas: Record<ZonaId, FilaZona> };

/**
 * Tabla de referencia. Armada a partir de tarifas publicadas de Correo Argentino (Clásico, octubre 2026):
 * a domicilio 1, 5 y 10 kg por zona tarifaria; a sucursal 1 kg. Los tramos de 15 a 25 kg y el resto de
 * sucursal están proyectados con la misma pendiente y proporción. Es una ESTIMACIÓN: el precio exacto solo
 * sale de la API del correo (MiCorreo / Andreani) o de las tarifas de tu contrato. Se edita en Panel → Envíos.
 */
export const TABLA_EJEMPLO: TablaEnvios = {
  tramosKg: [1, 5, 10, 15, 20, 25],
  zonas: {
    cordoba: { sucursal: [6739, 11170, 14939, 18709, 22478, 26248], domicilio: [9648, 15957, 21342, 26727, 32112, 37497], plazo: "2 a 5 días hábiles" },
    centro: { sucursal: [7415, 12695, 18050, 23406, 28761, 34117], domicilio: [10509, 17880, 25423, 32966, 40509, 48052], plazo: "2 a 5 días hábiles" },
    norte: { sucursal: [7745, 14399, 22315, 30231, 38147, 46063], domicilio: [10586, 19724, 30568, 41412, 52256, 63100], plazo: "3 a 7 días hábiles" },
    patagonia: { sucursal: [7745, 14399, 22315, 30231, 38147, 46063], domicilio: [10586, 19724, 30568, 41412, 52256, 63100], plazo: "3 a 7 días hábiles" },
  },
};

export function leerTabla(json: unknown): TablaEnvios {
  const t = json as TablaEnvios | null;
  const valida =
    t &&
    Array.isArray(t.tramosKg) &&
    t.tramosKg.length > 0 &&
    ZONAS.every((z) => {
      const f = t.zonas?.[z.id];
      return f && [f.sucursal, f.domicilio].every((a) => Array.isArray(a) && a.length === t.tramosKg.length && a.every((n) => typeof n === "number" && n >= 0));
    });
  return valida ? t : TABLA_EJEMPLO;
}

/** Precio de un bulto: el del primer tramo que lo contiene; si supera el último, proporcional al último tramo. */
export function precioBulto(precios: number[], tramosKg: number[], pesoG: number): number {
  const kg = pesoG / 1000;
  const i = tramosKg.findIndex((t) => kg <= t);
  if (i >= 0) return precios[i];
  const ultimo = tramosKg.length - 1;
  return Math.round(precios[ultimo] * (kg / tramosKg[ultimo]));
}

export function cotizarConTabla(tabla: TablaEnvios, provincia: string, bultos: Bulto[]): Tarifa[] {
  const zona = zonaDeProvincia(provincia);
  if (!zona || !bultos.length) return [];
  const fila = tabla.zonas[zona];
  const suma = (precios: number[]) => bultos.reduce((s, b) => s + precioBulto(precios, tabla.tramosKg, b.pesoG), 0);
  return [
    { id: "tabla-sucursal", proveedor: "tabla", modalidad: "sucursal", nombre: "Retiro en sucursal de correo", costo: suma(fila.sucursal), plazo: fila.plazo },
    { id: "tabla-domicilio", proveedor: "tabla", modalidad: "domicilio", nombre: "Envío a domicilio", costo: suma(fila.domicilio), plazo: fila.plazo },
  ];
}

export function proveedorTabla(tabla: TablaEnvios): ShippingProvider {
  return { id: "tabla", configurado: () => true, cotizar: async (p: PedidoCotizacion) => cotizarConTabla(tabla, p.provincia, p.bultos) };
}
