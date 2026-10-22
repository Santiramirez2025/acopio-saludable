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

/** Video corto (30 s) de cómo armamos el pedido, para el «¿cómo llega?» y la desconfianza. */
export const VIDEO_ARMAMOS = { url: "/video/asi-armamos-tu-pedido.mp4", pie: "Así armamos tu pedido: guantes, balanza y bolsa kraft, el mismo día que sale" };

/** Fotos reales de la mercadería en la mesa de fraccionado (public/img/reales), por producto. */
const REALES_PRODUCTO: [RegExp, string, string][] = [
  [/mix.*500|500.*mix/i, "real-mix-500", "Mix clásico 500 g, recién fraccionado"],
  [/\bmix\b/i, "real-mix", "Mix clásico 1 kg, armado en el día"],
  [/almendra.*500|500.*almendra/i, "real-almendras-500", "Almendras Non Pareil 500 g"],
  [/almendra/i, "real-almendras", "Almendras Non Pareil 1 kg"],
  [/caj[uú]|casta[ñn]a/i, "real-caju", "Castañas de cajú 1 kg"],
  [/\bnuez|\bnueces/i, "real-nuez", "Nuez mariposa light 1 kg"],
  [/d[aá]til/i, "real-datiles", "Dátiles Deglet Nour 1 kg"],
  [/\bpasas?\b/i, "real-pasas", "Pasas de uva"],
  [/banana/i, "real-banana", "Banana chips 1 kg"],
  [/girasol/i, "real-girasol", "Girasol pelado 1 kg"],
  [/granola.*prote|prote.*granola/i, "real-granola-proteica", "Granola proteica 1 kg"],
  [/granola/i, "real-granola", "Granola tradicional 1 kg"],
  [/\bmiel\b/i, "real-miel", "Miel pura Los Dos Zánganos"],
  [/semilla/i, "real-semillas", "Mix de semillas 1 kg"],
];

/** La foto real del producto que se nombra (la primera que coincide), o null. */
export function fotoRealDe(texto: string): { url: string; pie: string } | null {
  const r = REALES_PRODUCTO.find(([re]) => re.test(texto));
  return r ? { url: `/img/reales/${r[1]}.jpg`, pie: r[2] } : null;
}

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
  return [VIDEO_ARMAMOS, ...REALES.slice(0, 1).map((r) => ({ url: url(r.archivo), pie: r.pie }))];
}

// ---------- Imágenes en el momento justo ----------
//
// Un vendedor experto muestra la foto cuando suma, no en cada mensaje. Reglas:
// · una imagen automática por respuesta, como mucho 3 por charla, y nunca la misma dos veces;
// · duda o desconfianza → la foto real de cómo llega el pedido;
// · nombra un combo → la imagen del combo;
// · pregunta por un producto que tiene imagen → la del producto;
// · se agenda el pedido → «así llega tu pedido», una vez, para cerrar con confianza.

type Turno = { de: "yo" | "acopio"; texto: string };
export type FotoOportuna = { url: string; pie: string };

const NOMBRES_COMBO: [RegExp, string, string][] = [
  [/despensa de 4 kilos|despensa grande/i, "despensa-4-kilos", "Despensa de 4 kilos"],
  [/despensa chica/i, "despensa-chica", "Despensa chica de 2 kilos"],
  [/alacena/i, "alacena-de-frutos-secos", "Alacena de frutos secos"],
  [/desayuno 30/i, "desayuno-30-dias", "Desayuno 30 días"],
  [/mixes del mes/i, "mixes-del-mes", "Mixes del mes"],
  [/pack gym|arranque gym/i, "arranque-gym", "Pack gym del mes"],
];
const PRODUCTOS_TEXTO: [RegExp, string, string][] = [
  [/\bnuez|\bnueces/i, "producto-nuez", "Nuez mariposa"],
  [/almendra/i, "producto-almendras", "Almendras"],
  [/caj[uú]/i, "producto-caju", "Castañas de cajú"],
  [/d[aá]til/i, "producto-datiles", "Dátiles Deglet Nour"],
  [/\bpasas?\b/i, "producto-pasas", "Pasas de uva"],
  [/\bmix\b/i, "producto-mix-clasico", "Mix clásico con cajú"],
];
const DUDA = /estafa|confi[aá]|confiable|es seguro|son de verdad|existen|tienen local|d[oó]nde est[aá]n|ver antes|c[oó]mo (llega|viene)|empaque|calidad|fresc/i;

export function fotosOportunas(a: { entrante: string; respuesta: string; combos?: string[]; historial: Turno[] }): FotoOportuna[] {
  const nuestros = a.historial.filter((t) => t.de === "acopio").map((t) => t.texto);
  const yaMandadas = nuestros.filter((t) => t.startsWith("[Foto]"));
  if (yaMandadas.length >= 3) return [];
  const yaSalio = (pie: string) => yaMandadas.some((t) => t.includes(pie));
  const candidata = (archivo: string, pie: string): FotoOportuna | null => (yaSalio(pie) ? null : { url: url(archivo), pie });
  const real = REALES[0];

  // 1. Duda o desconfianza: la foto real convence más que cualquier texto.
  if (DUDA.test(a.entrante)) {
    const f = candidata(real.archivo, real.pie);
    if (f) return [f];
  }
  // 2. Se cierra el pedido: «así llega», una vez.
  if (/agendad|queda confirmad|tu pedido es el/i.test(a.respuesta)) {
    const f = candidata(real.archivo, real.pie);
    return f ? [f] : [];
  }
  // 3. Un combo nombrado (en el texto o en los botones).
  for (const [re, slug, nombre] of NOMBRES_COMBO) {
    if (re.test(a.respuesta) || a.combos?.includes(slug)) {
      const f = candidata(COMBOS[slug], nombre);
      if (f) return [f];
    }
  }
  // 4. Preguntó por un producto con imagen y le contestamos el precio.
  if (/\$\s?\d/.test(a.respuesta)) {
    for (const [re, archivo, pie] of PRODUCTOS_TEXTO) {
      if (re.test(a.entrante)) {
        const f = candidata(archivo, pie);
        if (f) return [f];
      }
    }
  }
  // 4b. Vuelve por la reactivación o un seguimiento («Sí, pasame precios») y le contestamos con precios: entra por los ojos.
  if (/pasame precios|pasame los precios|agendalo/i.test(a.entrante) && /\$\s?\d/.test(a.respuesta)) {
    const f = candidata("producto-mix-clasico", "Mix clásico con cajú · el más pedido");
    if (f) return [f];
  }
  // 5. Primera respuesta con precios (el «precios por kilo» del anuncio): entra por los ojos con lo más pedido.
  if (!nuestros.length && /\$\s?\d/.test(a.respuesta)) {
    const f = candidata("producto-mix-clasico", "Mix clásico con cajú · el más pedido");
    if (f) return [f];
  }
  return [];
}
