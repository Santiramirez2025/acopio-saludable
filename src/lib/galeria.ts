// Galería de imágenes con diseño propio (1080×1350, logo de Acopio de marca de agua), en public/img/galeria.
// Es lo que manda el vendedor por WhatsApp: una imagen vende más que un texto.
// Se generan con scripts/galeria (plantilla HTML + fotos de producto y fotos reales del reel).
//
// Puro (sin base): se prueba sin gastar nada.

const BASE = "/img/galeria";

/** Combos con imagen propia (por slug). */
const COMBOS: Record<string, string> = {
  "despensa-4-kilos": "combo-despensa-4-kilos",
  "despensa-chica": "combo-despensa-chica",
  "alacena-de-frutos-secos": "combo-alacena-de-frutos-secos",
  "desayuno-30-dias": "combo-desayuno-30-dias",
  "mixes-del-mes": "combo-mixes-del-mes",
  "arranque-gym": "combo-arranque-gym",
};

/** Productos con imagen propia (por código). */
const PRODUCTOS: Record<string, string> = {
  "TG-NUEZ": "producto-nuez",
  "LG-ALMNP": "producto-almendras",
  "LG-ALMNP-500": "producto-almendras",
  "TG-ALMGUARA": "producto-almendras",
  "TG-CAJU": "producto-caju",
  "TG-MIXCG": "producto-mix-clasico",
  "TG-MIXCG-500": "producto-mix-clasico",
  "TG-MIXC": "producto-mix-clasico",
  "TG-MIXGIR": "producto-mix-clasico",
  "LG-DATIL": "producto-datiles",
  "LG-DATIL-500": "producto-datiles",
  "TG-PASAS": "producto-pasas",
  "TG-PASAS-500": "producto-pasas",
  "LG-PASASRUBIAS": "producto-pasas",
};

/** Fotos reales: cómo armamos y cómo llega el pedido. Para la desconfianza y el «¿cómo llega?». */
export const REALES = [
  { archivo: "real-asi-llega", pie: "Así llega tu pedido: en bolsa kraft, fraccionado y con una nota para vos" },
  { archivo: "real-armamos-tu-pedido", pie: "Así armamos tu despensa, el mismo día que sale" },
  { archivo: "real-datiles", pie: "Dátiles Deglet Nour recién fraccionados" },
];

const url = (archivo: string) => `${BASE}/${archivo}.jpg`;

export function imagenCombo(slug: string): string | null {
  return COMBOS[slug] ? url(COMBOS[slug]) : null;
}

export function imagenProducto(codigo: string): string | null {
  return PRODUCTOS[codigo] ? url(PRODUCTOS[codigo]) : null;
}

/** ¿Pide ver cómo llega, cómo lo arman o el empaque? */
export function pideFotosReales(consulta: string): boolean {
  return /c[oó]mo (llega|viene|lo arman|lo mandan|lo env[ií]an)|empaque|embalaje|paquete|bolsa|env[ií]o|pedido armado|reales?|de verdad/i.test(consulta);
}

export function fotosReales(): { url: string; pie: string }[] {
  return REALES.map((r) => ({ url: url(r.archivo), pie: r.pie }));
}
