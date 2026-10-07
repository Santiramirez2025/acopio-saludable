// Clasificación automática BORRADOR de nicho y objetivo, y reglas de publicación por defecto.
// Es un punto de partida por palabras clave: se corrige producto por producto desde el panel.

import type { NichoId, ObjetivoId } from "./taxonomia";

export type DatosClasificables = {
  producto: string;
  presentacion: string;
  categoria: string;
  formato: string;
  contenido: number | null;
};

export function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const tiene = (texto: string, patrones: RegExp) => patrones.test(texto);

export function clasificarNichos(p: DatosClasificables): NichoId[] {
  const t = normalizar(`${p.producto} ${p.presentacion}`);
  const cat = normalizar(p.categoria);
  const fmt = normalizar(p.formato);
  const grande = (p.contenido ?? 0) >= 1000 || fmt.includes("bolson");
  const out = new Set<NichoId>();

  if (
    cat.includes("cereales") ||
    cat.includes("infusiones") ||
    tiene(t, /mermelada|miel|copos|granola|almohadita|azucar|edulcorante|\bte\b|cafe|yerba|avena/)
  )
    out.add("hoteleria");

  if (tiene(t, /protei|barrita|pasta de mani|creatina|avena|whey|magnesio|colageno|granola/) || cat.includes("suplementos"))
    out.add("gimnasios");

  if (
    fmt.includes("fraccionado") ||
    fmt.includes("bolson") ||
    /frutos secos|semillas|legumbres|harinas|especias|frutas desecadas|suplementos/.test(cat)
  )
    out.add("dieteticas");

  if (
    /reposteria|chocolates|harinas|panificados/.test(cat) ||
    tiene(t, /cacao|coco rallado|chips|azucar|cafe|nuez|almendra|pasas|sesamo|girasol|esencia|premezcla|avena/)
  )
    out.add("cafeterias");

  if (
    (cat.includes("especias") && grande) ||
    tiene(t, /oregano|aji molido|pimenton|provenzal|condimento|comino|pimienta|ajo en polvo|aceite|harina|tomate|aceituna/)
  )
    out.add("rotiserias");

  if (
    fmt.includes("multiple") ||
    fmt.includes("unidad suelta") ||
    tiene(t, /barrita|alfajor|snack|galletita|chocolate|turron|caramelo|mani /)
  )
    out.add("kioscos");

  if (
    cat.includes("infusiones") ||
    tiene(t, /cafe|\bte\b|yerba|edulcorante|azucar|galletita|barrita|mix frutos|granola/)
  )
    out.add("oficinas");

  if (
    /supermercado|almacen|cereales|panificados|legumbres|frutos secos|frutas desecadas/.test(cat) ||
    fmt.includes("envasado de marca")
  )
    out.add("familias");

  return [...out];
}

const REGLAS_OBJETIVO: [ObjetivoId, RegExp][] = [
  ["energia", /maca|guarana|spirulina|espirulina|ginseng|cafe verde|yerba|vitamina b|b12|polen/],
  ["descanso", /magnesio|manzanilla|tilo|valeriana|melisa|pasionaria|melatonina|lavanda/],
  ["digestion", /fibra|salvado|psyllium|chia|lino|kefir|probiotic|ciruela|boldo|cedron|menta|jengibre/],
  ["huesos", /calcio|vitamina d|colageno|cartilago|magnesio/],
  ["musculo", /protei|creatina|whey|bcaa|pasta de mani|magnesio|aminoacido/],
  ["piel", /colageno|biotina|levadura de cerveza|vitamina e|rosa mosqueta|acido hialuronico/],
  ["corazon", /omega|chia|lino|nuez|avena|almendra/],
  ["defensas", /vitamina c|propoleo|zinc|equinacea|ajo negro|jalea real|polen/],
];

export function clasificarObjetivos(p: DatosClasificables): ObjetivoId[] {
  const t = normalizar(`${p.producto} ${p.presentacion}`);
  return REGLAS_OBJETIVO.filter(([, re]) => re.test(t)).map(([id]) => id);
}

// Nombres que son en sí mismos una indicación terapéutica: quedan ocultos hasta que el dueño decida.
const TERAPEUTICO =
  /tintura madre|ansiolit|antiespasm|acidez|acido urico|diabet|colesterol|hipertens|\bpresion\b|adelgaz|quema ?gras|laxant|diuretic|\bartri|reuma|varic|hemorroid|prostat|insomnio|depres|antiinflam|antibiot|antiparasit|hepat|gastritis|migra|asma|\btos\b|gripe|anemia|tiroid/;

export function motivoOculto(p: DatosClasificables): string | null {
  const t = normalizar(`${p.producto} ${p.presentacion}`);
  if (TERAPEUTICO.test(t)) return "Nombre con indicación terapéutica: revisar antes de publicar";
  if (normalizar(p.categoria).includes("congelados")) return "Congelado o refrigerado: requiere cadena de frío para envíos";
  return null;
}

/** "g" o "ml" según cómo viene escrita la presentación. */
export function detectarUnidad(presentacion: string, contenido: number | null): "g" | "ml" | null {
  if (!contenido) return null;
  return /\d\s*(cc|ml|cm3|lts?|litros?|l)\b/i.test(presentacion) ? "ml" : "g";
}

/** Peso bruto estimado (contenido + envase), en gramos. Editable desde el panel. */
export function estimarPesoBruto(p: DatosClasificables, unidad: "g" | "ml" | null): number | null {
  if (!p.contenido || p.contenido <= 0) return null;
  const fmt = normalizar(p.formato);
  let factor = 1.12;
  let minimoEnvase = 20;
  if (unidad === "ml") {
    factor = 1.35;
    minimoEnvase = 60;
  } else if (fmt.includes("bolson")) {
    factor = 1.02;
    minimoEnvase = 50;
  } else if (fmt.includes("fraccionado")) {
    factor = 1.03;
    minimoEnvase = 10;
  }
  return Math.round(Math.max(p.contenido * factor, p.contenido + minimoEnvase));
}
