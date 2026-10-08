// Tabla de envíos por peso y zona: el respaldo cuando no hay credenciales de un correo o su API falla.

import { ZONAS, zonaDeProvincia, type ZonaId } from "./geo";
import type { Bulto, PedidoCotizacion, ShippingProvider, Tarifa } from "./tipos";

export type FilaZona = { sucursal: number[]; domicilio: number[]; plazo: string };
export type TablaEnvios = { tramosKg: number[]; zonas: Record<ZonaId, FilaZona> };

/**
 * VALORES DE EJEMPLO, no son tarifas reales de ningún correo.
 * Se editan en Panel → Envíos; el panel avisa hasta que se marquen como revisados.
 */
export const TABLA_EJEMPLO: TablaEnvios = {
  tramosKg: [1, 5, 10, 15, 20, 25],
  zonas: {
    cordoba: { sucursal: [5000, 7000, 9500, 12000, 14500, 17000], domicilio: [6500, 9000, 12000, 15000, 18000, 21000], plazo: "2 a 4 días hábiles" },
    centro: { sucursal: [6500, 9500, 13000, 16500, 20000, 23500], domicilio: [8500, 12000, 16500, 21000, 25500, 30000], plazo: "3 a 6 días hábiles" },
    norte: { sucursal: [7500, 11000, 15500, 20000, 24500, 29000], domicilio: [9500, 14000, 19500, 25000, 30500, 36000], plazo: "4 a 8 días hábiles" },
    patagonia: { sucursal: [9000, 13500, 19000, 24500, 30000, 35500], domicilio: [11500, 17000, 24000, 31000, 38000, 45000], plazo: "5 a 10 días hábiles" },
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
