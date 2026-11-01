// De qué zona de envío es lo que escribió la persona. Puro: se prueba sin base.

import { PROVINCIAS } from "./envios/geo";

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

