// Galería de imágenes con diseño propio (1080×1350, logo de Acopio de marca de agua), en public/img/galeria.
// Es lo que manda el vendedor por WhatsApp: una imagen vende más que un texto.
// Se generan con scripts/galeria (plantilla HTML + fotos de producto y fotos reales del reel).
//
// Puro (sin base): se prueba sin gastar nada.

import { hablaDeFueraDeZona } from "./envio-zona";
import { avisoReparto } from "./salida-reparto";

const BASE = "/img/galeria";

/** Combos con imagen propia (por slug). */
const COMBOS: Record<string, string> = {
  "despensa-4-kilos": "combo-despensa-4-kilos",
  "despensa-chica": "combo-despensa-chica",
  "alacena-de-frutos-secos": "combo-alacena-de-frutos-secos",
  "desayuno-30-dias": "combo-desayuno-30-dias",
  "mixes-del-mes": "combo-mixes-del-mes",
  "arranque-gym": "combo-arranque-gym",
  "trio-del-desayuno": "combo-trio-del-desayuno",
  "trio-de-frutos-secos": "combo-trio-de-frutos-secos",
  "pan-dulce-casero": "combo-pan-dulce-casero",
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
  "LG-MIXSEM": "producto-mix-semillas",
  "LG-MIXSEM-500": "producto-mix-semillas",
  "TG-QUINOAPOP": "producto-quinoa-pop",
};

/** Video corto (30 s) de cómo armamos el pedido, para el «¿cómo llega?» y la desconfianza. */
export const VIDEO_ARMAMOS = { url: "/video/asi-armamos-tu-pedido.mp4", pie: "Así armamos tu pedido: guantes, balanza y bolsa kraft, el mismo día que sale" };

/** Fotos reales de la mercadería en la mesa de fraccionado (public/img/reales), por producto. */
const REALES_PRODUCTO: [RegExp, string, string][] = [
  [/semilla/i, "real-semillas", "Mix de semillas 1 kg (lino, chía y sésamo)"],
  [/mix.*500|500.*mix/i, "real-mix-500", "Mix clásico 500 g, recién fraccionado"],
  [/\bmix\b/i, "real-mix", "Mix clásico 1 kg, armado en el día"],
  [/almendra.*500|500.*almendra/i, "real-almendras-500", "Almendras Non Pareil 500 g"],
  [/almendra/i, "real-almendras", "Almendras Non Pareil 1 kg"],
  [/caj[uú]|casta[ñn]a/i, "real-caju", "Castañas de cajú 1 kg"],
  [/\bnuez|\bnueces/i, "real-nuez", "Nuez mariposa light 1 kg"],
  [/d[aá]til/i, "real-datiles-v2", "Dátiles con carozo 1 kg"],
  [/\bpasas?\b/i, "real-pasas", "Pasas de uva"],
  [/banana/i, "real-banana", "Banana chips 1 kg"],
  [/girasol/i, "real-girasol", "Girasol pelado 1 kg"],
  [/granola.*prote|prote.*granola/i, "real-granola-proteica", "Granola proteica 1 kg"],
  [/granola/i, "real-granola", "Granola tradicional 1 kg"],
  [/\bmiel\b/i, "real-miel", "Miel pura Los Dos Zánganos"],
];

/** La foto real del producto que se nombra (la primera que coincide), o null. */
export function fotoRealDe(texto: string): { url: string; pie: string } | null {
  const r = REALES_PRODUCTO.find(([re]) => re.test(texto));
  return r ? { url: `/img/reales/${r[1]}.jpg`, pie: r[2] } : null;
}

/**
 * Foto real de la mesa de fraccionado para la ficha de un producto (14/11, Santiago: «mejoramos las imágenes»).
 * Va como segunda foto de la galería («así te llega»); en la miel va primera, porque la ilustración
 * mostraba pasta de maní y la foto real es el frasco que llevamos. Por código, para no confundir
 * «semillas de girasol» con el mix de semillas.
 */
const REAL_POR_CODIGO: [RegExp, string][] = [
  [/^TG-NUEZ/, "real-nuez"],
  [/^LG-ALMNP-500$/, "real-almendras-500"],
  [/^LG-ALMNP/, "real-almendras"],
  [/^TG-CAJU$/, "real-caju"],
  [/^TG-BANANA/, "real-banana"],
  [/^LG-DATIL/, "real-datiles-v2"],
  [/^TG-GIRASOL/, "real-girasol"],
  [/^(LG|TG)-GPROTE/, "real-granola-proteica"],
  [/^(LG|TG)-GTRAD/, "real-granola"],
  [/^LG-MIEL/, "real-miel"],
  [/^TG-MIX(C|CG)-500$/, "real-mix-500"],
  [/^TG-MIX(C|CG)$/, "real-mix"],
  [/^TG-PASAS/, "real-pasas"],
  [/^LG-MIXSEM/, "real-semillas"],
];

export function fotoRealProducto(codigo: string): string | null {
  const r = REAL_POR_CODIGO.find(([re]) => re.test(codigo));
  return r ? `/img/reales/${r[1]}.jpg` : null;
}

/**
 * Foto real primero solo donde se pide explícito. 19/11 se pusieron primeras todas las reales y el 20/11 Santiago
 * las bajó: «no me gustan las imágenes medio crudas, mi mano agarrando un paquete de 500 de dátiles; que no parezca
 * todo tan casero». La foto principal es la de producto (prolija y con el mismo estilo); la real queda en la galería.
 */
export const REAL_PRIMERO = new Set<string>([]);

/** Video real del producto en la galería de la ficha (22/11: los dátiles egipcios en la caja, tomados por Santiago). */
// 22/11: tomas crudas del celular de Santiago (IMG_86xx, IMG_91xx), cortadas al producto, con música alegre propia.
const VIDEO_POR_CODIGO: Record<string, string> = {
  "LG-DATIL": "/video/productos/lg-datil.mp4",
  "LG-DATIL-500": "/video/productos/lg-datil.mp4",
  "LG-DATIL-5KG": "/video/productos/lg-datil.mp4",
  "TG-MIXCG": "/video/productos/tg-mixcg.mp4",
  "TG-MIXCG-500": "/video/productos/tg-mixcg.mp4",
  "TG-MIXC": "/video/productos/tg-mixc.mp4",
  "TG-MIXC-500": "/video/productos/tg-mixc.mp4",
  "TG-CAJU": "/video/productos/tg-caju.mp4",
  "TG-NUEZ": "/video/productos/tg-nuez.mp4",
};
export function videoProducto(codigo: string): string | null {
  return VIDEO_POR_CODIGO[codigo] ?? null;
}

/** Fotos reales: cómo armamos y cómo llega el pedido. Para la desconfianza y el «¿cómo llega?». */
export const REALES = [
  { archivo: "real-asi-llega", pie: "Así llega tu pedido: en bolsa kraft, fraccionado y con una nota para vos" },
  { archivo: "real-armamos-tu-pedido", pie: "Así armamos tu despensa, el mismo día que sale" },
  { archivo: "real-datiles-v2", pie: "Dátiles con carozo recién fraccionados" },
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
  [/tr[ií]o de frutos|tr[ií]o (con|de) mix|3 ?(kg|kilos) (con|de) (mix|frutos)/i, "trio-de-frutos-secos", "Trío de frutos secos: mix con cajú, dátiles y pasas"],
  [/tr[ií]o del desayuno|tr[ií]o (con|de) semillas/i, "trio-del-desayuno", "Trío del desayuno: semillas, dátiles y pasas"],
  // 17/11: a Clau, que pedía el Trío del anuncio (frutos secos), le llegó la foto del Trío del desayuno. «Trío» a secas es el del anuncio.
  [/tr[ií]o/i, "trio-de-frutos-secos", "Trío de frutos secos: mix con cajú, dátiles y pasas"],
  [/pan dulce casero|combo pan dulce/i, "pan-dulce-casero", "Pan dulce casero: pasas y dátiles"],
  [/despensa de 4 kilos|despensa grande/i, "despensa-4-kilos", "Despensa de 4 kilos"],
  [/despensa chica/i, "despensa-chica", "Despensa chica de 2 kilos"],
  [/alacena/i, "alacena-de-frutos-secos", "Alacena de frutos secos"],
  [/desayuno 30/i, "desayuno-30-dias", "Desayuno 30 días"],
  [/mixes del mes/i, "mixes-del-mes", "Mixes del mes"],
  [/pack gym|arranque gym/i, "arranque-gym", "Pack gym del mes"],
];
// El orden importa: «mix de semillas» tiene que caer en semillas, no en el mix de frutos secos
// (12/11: Olga y Graciela recibieron el Trío pensando que el mix era de frutos secos).
const PRODUCTOS_TEXTO: [RegExp, string, string][] = [
  [/semilla/i, "producto-mix-semillas", "Mix de semillas: lino, chía y sésamo (no son frutos secos) · {precio:LG-MIXSEM} el kilo"],
  [/quinoa/i, "producto-quinoa-pop", "Quinoa pop"],
  [/\bnuez|\bnueces/i, "producto-nuez", "Nuez mariposa · {precio:TG-NUEZ} el kilo"],
  [/almendra/i, "producto-almendras", "Almendras · {precio:TG-ALMGUARA} el kilo"],
  [/caj[uú]/i, "producto-caju", "Castañas de cajú · {precio:TG-CAJU} el kilo"],
  [/d[aá]til/i, "producto-datiles", "Dátiles con carozo · {precio:LG-DATIL} el kilo"],
  [/\bpasas?\b/i, "producto-pasas", "Pasas de uva · {precio:TG-PASAS} el kilo"],
  [/\bmix\b(?! de semillas)/i, "producto-mix-clasico", "Mix clásico con cajú · {precio:TG-MIXC} el kilo"],
];
// 14/11: «harina de almendras», «pasta de maní crocante» o lo que es por encargo no son la almendra ni el mix
// de la foto: mandar esa imagen (o el video del mix) confunde. En esos casos no va foto de producto.
const DERIVADO = /harina|pasta de|con chocolate|aceite|leche de|bebida|crema de/i;
// 15/11: Graciela pidió «mandame solo el mix» y le llegó la foto de la nuez que estaba sacando. Si saca algo, sin foto.
const SACA = /\bsolo\b|sac[aá](me|lo|la)?\b|sin (la|el|los|las)\b|no quiero|sacamos/i;
const esDerivado = (a: { entrante: string; respuesta: string }) => DERIVADO.test(a.entrante) || SACA.test(a.entrante) || /por encargo|sacamos/i.test(a.respuesta);
const ENTUSIASMO = /me gust[oó]|me encant|qu[eé] (rico|lindo|bueno|buena pinta)|quiero todo|todo+ (me gusta|rico|lindo)|espectacular|hermos[oa]|buen[ií]simo|riqu[ií]sim/i;
const KITS_PARA_MOSTRAR: [string, string][] = [
  ["alacena-de-frutos-secos", "Alacena de frutos secos: nuez, mix con cajú y pasas (3 kg)"],
  ["despensa-4-kilos", "Despensa de 4 kilos: mix, dátiles, pasas y semillas"],
  ["trio-de-frutos-secos", "Trío de frutos secos: mix con cajú, dátiles y pasas"],
];
/** «Trío de frutos secos · mix…» y «Trío de frutos secos: mix…» son la misma foto: se compara el nombre (hasta «·» o «:»). */
const nombreDePie = (pie: string) => pie.split(/ · |: /)[0].trim().slice(0, 40).toLowerCase();
const DUDA = /estafa|confi[aá]|confiable|es seguro|son de verdad|existen|tienen local|d[oó]nde est[aá]n|ver antes|c[oó]mo (llega|viene)|empaque|calidad|fresc/i;

function fotosBase(a: { entrante: string; respuesta: string; combos?: string[]; historial: Turno[]; mixClasicoDisponible?: boolean }): FotoOportuna[] {
  // 12/11: con el Mix clásico sin stock, la foto de «el más pedido» mostraba algo que no se podía vender (Elvira).
  const masPedido = (): FotoOportuna | null =>
    a.mixClasicoDisponible === false ? candidata("combo-trio-del-desayuno", "Trío del desayuno: semillas, dátiles y pasas") : candidata("combo-trio-de-frutos-secos", "Trío de frutos secos: mix con cajú, dátiles y pasas · el más pedido") ?? candidata("producto-mix-clasico", "Mix clásico con cajú · el más pedido");
  const nuestros = a.historial.filter((t) => t.de === "acopio").map((t) => t.texto);
  const yaMandadas = nuestros.filter((t) => t.startsWith("[Foto]"));
  // 12/11 (Santiago): «todas las ventas con imágenes, entra por los ojos». Hasta 4 fotos por charla, nunca repetida.
  if (yaMandadas.length >= 4) return [];
  const yaSalio = (pie: string) => yaMandadas.some((t) => t.toLowerCase().includes(nombreDePie(pie)));
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
  // 3. Un combo que la persona nombró o eligió (no uno que el vendedor ofreció por su cuenta).
  const hablaDeCombos = /combo|despensa|alacena|kit|bolsa|caja|mesa|regalo|recomend|conviene|aconsej/i.test(a.entrante);
  const conPrecio = /\$\s?\d/.test(a.respuesta);
  for (const [re, slug, nombre] of NOMBRES_COMBO) {
    // 12/11: también cuando el vendedor ofrece el combo con precio: que vea qué trae antes de pagar.
    if (re.test(a.entrante) || (conPrecio && re.test(a.respuesta)) || (hablaDeCombos && (re.test(a.respuesta) || a.combos?.includes(slug)))) {
      const f = candidata(COMBOS[slug], `${nombre} · {combo:${slug}}`);
      if (f) return [f];
    }
  }
  // 3b. 25/11 (Santiago, por Patricia: «Me gustó todooooo»): «todo entra por la vista». Cuando se entusiasma, se le muestra
  // un kit que todavía no vio, con el precio del día en el pie (la gráfica nunca lleva precio impreso).
  if (ENTUSIASMO.test(a.entrante)) {
    for (const [slug, nombre] of KITS_PARA_MOSTRAR) {
      const f = candidata(COMBOS[slug], `${nombre} · {combo:${slug}}`);
      if (f) return [f];
    }
  }
  // 4. Preguntó por un producto con imagen y le contestamos el precio.
  if (/\$\s?\d/.test(a.respuesta) && !esDerivado(a)) {
    for (const [re, archivo, pie] of PRODUCTOS_TEXTO) {
      if (re.test(a.entrante) || re.test(a.respuesta)) {
        const f = candidata(archivo, pie);
        if (f) return [f];
      }
    }
  }
  // 4b. Vuelve por la reactivación o un seguimiento («Sí, pasame precios») y le contestamos con precios: entra por los ojos.
  if (/pasame precios|pasame los precios|agendalo/i.test(a.entrante) && /\$\s?\d/.test(a.respuesta)) {
    const f = masPedido();
    if (f) return [f];
  }
  // 5. Primera respuesta a un pedido de precios en general (el «precios por kilo» del anuncio): lo más pedido.
  // Si pidió un producto puntual (una granola, una harina), no: la foto del mix no tiene nada que ver.
  const preciosEnGeneral = /precio|lista|por kilo|cat[aá]logo|qu[eé] (tienen|venden|hay)/i.test(a.entrante);
  if (!nuestros.length && preciosEnGeneral && /\$\s?\d/.test(a.respuesta)) {
    const f = masPedido();
    if (f) return [f];
  }
  return [];
}

/** Videos de venta (Santiago, 12/11: «vendemos con precio y video, y logo para que nos reconozcan»).
 *  El pie lleva {precio:CODIGO} y atencion.ts lo reemplaza por el precio del día. Uno por tema y por charla. */
const VIDEOS: [RegExp, string, string][] = [
  [/semilla|tr[ií]o del desayuno/i, "/video/reels/reel-2026-11-12-semillas-no-frutos-secos.mp4", "Mix de semillas (lino, chía y sésamo) vs. mix de frutos secos: los dos fraccionados en el día"],
  [/mix|frutos secos|despensa|alacena|nuez|caj[uú]|almendra|man[ií]\b/i, "/video/reels/reel-2026-11-12-asi-armamos-tu-mix.mp4", "Así armamos tu mix de frutos secos, a mano y el mismo día · Mix clásico con cajú y girasol {precio:TG-MIXCG} el kilo"],
  // 21/11: fuera «Repartimos todos los días a las 16: si pagás antes de las 15, hoy lo tenés». Empuja a pagar antes
  // (CONFIANZA PRIMERO) y salía junto con foto y texto: tres mensajes por una pregunta (Norberto).
];

export function fotosOportunas(a: { entrante: string; respuesta: string; combos?: string[]; historial: Turno[]; mixClasicoDisponible?: boolean; ahoraMs?: number }): FotoOportuna[] {
  // 21/11 (Santiago): «Enviar fotos es clave. La foto es lo que más vende, no puede faltar», pero sin saturar:
  // Norberto recibió la MISMA foto del Trío dos veces y un video en 3 minutos; Leila, foto + video + texto.
  // Reglas: una imagen por respuesta (nunca foto + video juntos), nunca la misma imagen dos veces en la charla,
  // un solo video por charla y como mucho 4 imágenes en toda la charla (si pide más, va por ver_fotos).
  const nuestras = a.historial.filter((t) => t.de === "acopio" && /^\[(Foto|Video)\]/.test(t.texto)).map((t) => t.texto);
  if (nuestras.length >= 4) return [];
  const yaVideo = nuestras.some((t) => t.startsWith("[Video]"));
  // «Trío de frutos secos · mix…» y «Trío de frutos secos: mix…» son la misma foto: se compara el nombre (hasta «·» o «:»).
  const yaSalio = (f: FotoOportuna) => nuestras.some((t) => t.toLowerCase().includes(nombreDePie(f.pie)));
  return fotosOportunasSinTope(a)
    .filter((f) => !yaSalio(f) && !(yaVideo && /\.mp4$/i.test(f.url)))
    .slice(0, 1);
}

function fotosOportunasSinTope(a: { entrante: string; respuesta: string; combos?: string[]; historial: Turno[]; mixClasicoDisponible?: boolean; ahoraMs?: number }): FotoOportuna[] {
  const fotos = fotosBase(a);
  const nuestros = a.historial.filter((t) => t.de === "acopio").map((t) => t.texto);
  const videosYa = nuestros.filter((t) => t.startsWith("[Video]"));
  if (videosYa.length >= 2) return fotos;
  const conPrecio = /\$\s?\d/.test(a.respuesta);
  for (const [re, archivo, pie] of VIDEOS) {
    const yaSalio = videosYa.some((t) => t.includes(pie.split(" · ")[0].slice(0, 30)));
    if (yaSalio) continue;
    if (archivo.includes("asi-armamos") && (a.mixClasicoDisponible === false || esDerivado(a))) continue;
    // 13/11: a Graciela (Córdoba Capital) le llegó «si pagás antes de las 15, hoy lo tenés» con el costo del envío. Es solo para la zona.
    if (archivo.includes("repartimos-cada-dia") && hablaDeFueraDeZona(`${a.entrante} ${a.respuesta}`)) continue;
    // 15/11: el domingo a Nanci le llegó «si pagás antes de las 15, hoy lo tenés». Solo sale cuando es verdad: hoy hay reparto y faltan las 15.
    if (archivo.includes("repartimos-cada-dia") && avisoReparto(a.ahoraMs ?? Date.now()).dia !== "hoy") continue;
    if (re.test(a.entrante) || (conPrecio && re.test(a.respuesta))) return fotos.length ? [fotos[0], { url: archivo, pie }] : [{ url: archivo, pie }];
  }
  return fotos;
}
