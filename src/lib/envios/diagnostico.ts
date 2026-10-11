// Prueba de conexión con los correos.
// Hace falta porque el orquestador se cae a la tabla en silencio: si las credenciales están mal,
// la tienda sigue vendiendo con tarifas estimadas y nadie se entera. Acá el error se ve entero.

import { leerConfig } from "../config";
import { armarBultos } from "./bultos";
import { proveedorAndreani } from "./andreani";
import { proveedorMiCorreo } from "./micorreo";
import type { ShippingProvider } from "./tipos";

export type Prueba = { proveedor: string; destino: string; ok: boolean; detalle: string };

/** Un envío chico a una zona cercana y uno más pesado a la punta del país. */
const CASOS = [
  { nombre: "CABA (1425), 1 kg", cp: "1425", provincia: "Buenos Aires", pesoG: 1000 },
  { nombre: "Ushuaia (9410), 5 kg", cp: "9410", provincia: "Tierra del Fuego", pesoG: 5000 },
] as const;

export const PROVEEDORES: ShippingProvider[] = [proveedorMiCorreo, proveedorAndreani];

async function probar(p: ShippingProvider, c: (typeof CASOS)[number], cpOrigen: string): Promise<Prueba> {
  try {
    const tarifas = await p.cotizar({
      cpOrigen,
      cpDestino: c.cp,
      provincia: c.provincia,
      bultos: armarBultos([{ pesoG: c.pesoG, cantidad: 1 }]),
      valorDeclarado: 100000,
    });
    return {
      proveedor: p.id,
      destino: c.nombre,
      ok: tarifas.length > 0,
      detalle: tarifas.length
        ? tarifas.map((t) => `${t.nombre}: $${t.costo.toLocaleString("es-AR")} · ${t.plazo}`).join(" — ")
        : "Contestó bien pero sin ninguna tarifa. Revisá el ID de cliente y el código postal de origen.",
    };
  } catch (e) {
    // "fetch failed" solo no dice nada: el motivo real (DNS, TLS, timeout) viene en `cause`.
    const causa = e instanceof Error && e.cause instanceof Error ? ` · ${e.cause.message}` : "";
    return { proveedor: p.id, destino: c.nombre, ok: false, detalle: `${e instanceof Error ? e.message : String(e)}${causa}` };
  }
}

export async function probarCorreos(): Promise<Prueba[]> {
  const cfg = await leerConfig();
  // En paralelo a propósito: en serie, dos correos que no responden se comen el tiempo de la función en Vercel.
  return Promise.all(PROVEEDORES.filter((p) => p.configurado()).flatMap((p) => CASOS.map((c) => probar(p, c, cfg.cpOrigen))));
}
