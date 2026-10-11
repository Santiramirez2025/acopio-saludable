// Tabla de envíos por peso y zona: el respaldo cuando no hay credenciales de un correo o su API falla.

import { ZONAS, zonaDeProvincia, type ZonaId } from "./geo";
import type { Bulto, PedidoCotizacion, ShippingProvider, Tarifa } from "./tipos";

export type FilaZona = { sucursal: number[]; domicilio: number[]; plazo: string };
export type TablaEnvios = {
  tramosKg: number[];
  zonas: Record<ZonaId, FilaZona>;
  /**
   * Seguro del correo: % del valor declarado que se suma al envío.
   * Va acá y no en una columna porque la tabla ya viaja como JSON en la configuración.
   * Andreani cobra ~1,21% del valor declarado. 0 o ausente = la tabla ya lo incluye.
   */
  seguroPct?: number;
  /**
   * Qué correo hace estos envíos. Da el nombre que ve el cliente y el link de seguimiento.
   * Vacío = correo genérico, sin link.
   */
  correo?: CorreoId;
};

export const CORREOS = [
  { id: "andreani", nombre: "Andreani" },
  { id: "micorreo", nombre: "Correo Argentino" },
] as const;
export type CorreoId = (typeof CORREOS)[number]["id"];

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
  if (!valida) return TABLA_EJEMPLO;
  // Un seguro mal cargado no puede inflarle el envío al cliente: fuera de 0-100 se ignora.
  const pct = Number(t.seguroPct);
  return {
    ...t,
    seguroPct: Number.isFinite(pct) && pct >= 0 && pct <= 100 ? pct : 0,
    correo: CORREOS.some((c) => c.id === t.correo) ? t.correo : undefined,
  };
}

/** Precio de un bulto: el del primer tramo que lo contiene; si supera el último, proporcional al último tramo. */
export function precioBulto(precios: number[], tramosKg: number[], pesoG: number): number {
  const kg = pesoG / 1000;
  const i = tramosKg.findIndex((t) => kg <= t);
  if (i >= 0) return precios[i];
  const ultimo = tramosKg.length - 1;
  return Math.round(precios[ultimo] * (kg / tramosKg[ultimo]));
}

/**
 * El seguro no entra en la tabla: los correos lo cobran como % del valor declarado, no por peso.
 * Se suma una sola vez por envío, no por bulto, porque se declara el pedido entero.
 */
export function seguroDeclarado(valorDeclarado: number, seguroPct: number): number {
  if (!(valorDeclarado > 0) || !(seguroPct > 0)) return 0;
  return Math.round(((valorDeclarado * seguroPct) / 100) * 100) / 100;
}

export function cotizarConTabla(tabla: TablaEnvios, provincia: string, bultos: Bulto[], valorDeclarado = 0): Tarifa[] {
  const zona = zonaDeProvincia(provincia);
  if (!zona || !bultos.length) return [];
  const fila = tabla.zonas[zona];
  const seguro = seguroDeclarado(valorDeclarado, tabla.seguroPct ?? 0);
  const suma = (precios: number[]) => Math.round((bultos.reduce((s, b) => s + precioBulto(precios, tabla.tramosKg, b.pesoG), 0) + seguro) * 100) / 100;
  // Con el correo elegido el cliente ve de quién es el envío; sin él, el nombre genérico de siempre.
  const correo = CORREOS.find((c) => c.id === tabla.correo)?.nombre;
  return [
    { id: "tabla-sucursal", proveedor: "tabla", modalidad: "sucursal", nombre: correo ? `${correo}: retiro en sucursal` : "Retiro en sucursal de correo", costo: suma(fila.sucursal), plazo: fila.plazo },
    { id: "tabla-domicilio", proveedor: "tabla", modalidad: "domicilio", nombre: correo ? `${correo} a domicilio` : "Envío a domicilio", costo: suma(fila.domicilio), plazo: fila.plazo },
  ];
}

export function proveedorTabla(tabla: TablaEnvios): ShippingProvider {
  return { id: "tabla", configurado: () => true, cotizar: async (p: PedidoCotizacion) => cotizarConTabla(tabla, p.provincia, p.bultos, p.valorDeclarado) };
}
