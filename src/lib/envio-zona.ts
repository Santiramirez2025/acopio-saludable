// De qué zona de envío es lo que escribió la persona. Puro: se prueba sin base.

import { PROVINCIAS } from "./envios/geo";
import type { EnvioCotizado } from "./asistente-catalogo";
import { envioPropioPara, umbralZona, type ReglaMinimo } from "./minimo-zona";
import { pesos } from "./precios";

const sinTildes = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

// Donde llegamos con entrega propia sin cargo: los mismos lugares que dice datos_de_la_tienda.
const PROPIA = /\b(carlos paz|vcp|villa carlos paz|estancia vieja|santa cruz del lago|villa santa cruz del lago|villa parque siquiman|siquiman|villa del lago|playas de oro|san roque|bialet masse|cabalango|tanti|san antonio de arredondo|arredondo|mayu sumaj|icho cruz|cuesta blanca|tala huasi|villa rio icho cruz|el fantasio|fantasio|fantacio|la cuesta|las malvinas|sol y rio|costa azul|carlos paz sierras|los manantiales|colinas de carlos paz|villa dominguez|miradores del lago|altos de carlos paz|balcones de carlos paz|villa independencia|los eucaliptus|jose munoz|villa suiza|solares de las ensenadas|las ensenadas|villa carlos paz centro)\b/;
// Córdoba capital: la segunda zona de entrega propia, con precio.
const CAPITAL = /\b(cordoba capital|ciudad de cordoba|nueva cordoba|cerro de las rosas|general paz|alberdi|guemes|centro de cordoba|argüello|arguello|villa belgrano|alta cordoba|la calera|saldan|paseo rivera|rivera indarte|poeta lugones|urca|cofico|villa cabrera|marques de sobremonte|los boulevares|barrio jardin|barrio juniors|barrio yofre|cordoba zona (?:norte|sur)|zona (?:norte|sur) de cordoba|^cordoba$)\b/;

export type Zona = { tipo: "propia" } | { tipo: "capital" } | { tipo: "correo"; provincia: string } | null;

/** Puro: de qué zona es lo que escribió. null si no se puede saber (hay que preguntar la provincia). */
export function zonaDeLugar(lugar: string, provincia?: string | null): Zona {
  const t = sinTildes(lugar);
  if (PROPIA.test(t)) return { tipo: "propia" };
  if (CAPITAL.test(t)) return { tipo: "capital" };
  const p = sinTildes(provincia ?? "");
  const porNombre = PROVINCIAS.find((x) => {
    const n = sinTildes(x.nombre);
    return (p && n === p) || t.includes(n) || (n === "ciudad autonoma de buenos aires" && /\b(caba|capital federal)\b/.test(t));
  });
  if (porNombre) return { tipo: "correo", provincia: porNombre.nombre };
  return null;
}

/**
 * El envío en la zona de reparto propio, según el subtotal: sin cargo desde el umbral de la zona; abajo,
 * el fijo configurado (si hay). Se recalcula cada vez que cambia el pedido, por eso vive aparte.
 */
export function envioZonaPropia(cfg: ReglaMinimo & { plazoEntregaPropia: string }, lugar: string, subtotal: number): EnvioCotizado {
  const fijo = envioPropioPara(cfg, subtotal);
  const umbral = umbralZona(cfg);
  // Sin subtotal (todavía no eligió nada) no se puede decir «no llega»: se da la regla entera.
  // El 5/11 a Deolinda, con una Despensa de $28.500, el bot le dijo $3.000 porque la herramienta recibía 0.
  if (fijo > 0 && subtotal <= 0) {
    return {
      lugar,
      costo: fijo,
      propia: true,
      zonaPropia: true,
      alRecibir: true,
      sinCargoDesde: umbral,
      detalle: `Envío a ${lugar}: sin cargo desde ${pesos(umbral)}; abajo de eso, ${pesos(fijo)}. Te lo llevamos nosotros en ${cfg.plazoEntregaPropia}.`,
    };
  }
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
