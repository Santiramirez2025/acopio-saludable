// Temporadas: la fecha comercial que se viene y cómo aprovecharla. Puro (sin base): se prueba sin gastar.
//
// Cada temporada tiene su ventana (desde cuándo se empuja), los combos que se destacan en la tienda y
// que el vendedor ofrece primero, las palabras con que la gente la pide y el texto del cartel.
// Para sumar una fecha nueva alcanza con agregarla acá y crear sus combos con la misma vigencia.

export type Temporada = {
  id: string;
  nombre: string;
  /** Mes-día de inicio y fin (inclusive), en hora argentina. Si fin < inicio, cruza el año. */
  desde: string;
  hasta: string;
  /** El día fuerte (para «faltan N días»). */
  dia: string;
  slugs: string[];
  patron: RegExp;
  titulo: string;
  bajada: string;
  /** Lo que el vendedor tiene que saber y hacer en esta temporada. */
  vendedor: string;
};

export const TEMPORADAS: Temporada[] = [
  {
    id: "navidad",
    nombre: "Navidad y fin de año",
    // Arranca en octubre: el pan dulce casero se planea con tiempo y es cuando más se buscan nueces.
    desde: "10-20",
    hasta: "12-31",
    dia: "12-24",
    slugs: ["pan-dulce-casero", "mesa-navidena", "regalo-navideno"],
    patron: /\b(navid|pan dulce|pan dulces|panes dulces|fiestas|fin de ano|ano nuevo|noche buena|nochebuena|regalo|canasta|mesa dulce|turron|budin navide|para las fiestas)/,
    titulo: "Llegan las fiestas: armá tu mesa sin salir de casa",
    bajada: "Nueces, almendras, pasas y chips para el pan dulce, y la mesa navideña de frutos secos lista para servir. Te lo llevamos sin cargo en Carlos Paz y alrededores.",
    vendedor:
      "Estamos en temporada de Navidad y fin de año: es la época del año en que más se venden frutos secos. Si menciona pan dulce, budín, las fiestas, regalos o la mesa navideña, ofrecé primero el combo de la temporada que corresponda (Kit Pan Dulce casero para cocinar, Mesa navideña para servir, Bolsa regalo para regalar). " +
      "Si pide un producto suelto de repostería (nuez, pasas, almendras), dale el precio y contale que el Kit Pan Dulce trae todo junto. Si dice que es para más adelante, ofrecé dejarlo reservado con fecha de entrega en diciembre.",
  },
  {
    id: "verano",
    nombre: "Verano y vacaciones",
    desde: "01-02",
    hasta: "02-28",
    dia: "01-15",
    slugs: ["picada-y-snacks", "despensa-4-kilos"],
    patron: /\b(verano|vacacion|pileta|viaje|ruta|camping|playa|turist)/,
    titulo: "Verano en las sierras: snacks y picadas para todo el día",
    bajada: "Mixes, maní y frutos secos para la pileta, la ruta o la cabaña. Te lo llevamos en Carlos Paz y alrededores.",
    vendedor:
      "Es temporada de verano en Carlos Paz: mucha gente de vacaciones en cabañas. Si dice que está de viaje o en una cabaña, ofrecé la Picada y snacks y la entrega en el alojamiento.",
  },
  {
    id: "vuelta-a-clases",
    nombre: "Vuelta a clases",
    desde: "02-15",
    hasta: "03-15",
    dia: "03-02",
    slugs: ["desayuno-30-dias", "merienda-sin-tacc"],
    patron: /\b(clases|colegio|escuela|vianda|merienda|recreo|chicos)/,
    titulo: "Vuelta a clases: meriendas y desayunos del mes resueltos",
    bajada: "Granola, frutos secos y snacks para la vianda, con opciones sin TACC.",
    vendedor: "Es vuelta a clases: si habla de chicos, vianda o merienda, ofrecé el Desayuno 30 días o la Merienda sin TACC.",
  },
];

const MS_DIA = 86_400_000;

/** Fecha en Argentina como «MM-DD». */
function mesDia(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" }).slice(5);
}

function enVentana(t: Temporada, md: string): boolean {
  return t.desde <= t.hasta ? md >= t.desde && md <= t.hasta : md >= t.desde || md <= t.hasta;
}

/** La temporada que rige hoy (la primera que coincide). */
export function temporadaActual(ahora = new Date()): Temporada | null {
  const md = mesDia(ahora);
  return TEMPORADAS.find((t) => enVentana(t, md)) ?? null;
}

/** Días que faltan para el día fuerte de la temporada (0 si es hoy, negativo si ya pasó este año). */
export function diasHasta(t: Temporada, ahora = new Date()): number {
  const anio = Number(ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" }).slice(0, 4));
  const hoy = Date.parse(`${ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" })}T00:00:00Z`);
  const dia = Date.parse(`${anio}-${t.dia}T00:00:00Z`);
  return Math.round((dia - hoy) / MS_DIA);
}

/** La próxima temporada que todavía no empezó (para prepararla con tiempo). */
export function proximaTemporada(ahora = new Date()): { t: Temporada; empiezaEn: number } | null {
  for (let i = 1; i <= 120; i++) {
    const d = new Date(ahora.getTime() + i * MS_DIA);
    const t = temporadaActual(d);
    if (t && t.id !== temporadaActual(ahora)?.id) return { t, empiezaEn: i };
  }
  return null;
}

/** Lo que entra a las instrucciones del vendedor mientras dura la temporada. */
export function bloqueTemporada(ahora = new Date()): string {
  const t = temporadaActual(ahora);
  if (!t) return "";
  const faltan = diasHasta(t, ahora);
  return `\n\nTEMPORADA: ${t.nombre.toUpperCase()}${faltan > 0 ? ` (faltan ${faltan} días)` : ""}\n- ${t.vendedor}`;
}

/** Palabras que cuentan como «lo que pide la gente», para el reporte diario. */
export const PRODUCTOS_DEMANDA: [string, RegExp][] = [
  ["nuez", /\bnuez|nueces\b/],
  ["almendras", /\balmendra/],
  ["cajú", /\bcaju|castana/],
  ["mix", /\bmix\b/],
  ["pasas", /\bpasa(s)?\b/],
  ["dátiles", /\bdatil/],
  ["maní", /\bmani\b/],
  ["semillas", /\bsemilla|girasol|zapallo|chia|lino\b/],
  ["granola", /\bgranola|avena\b/],
  ["sin TACC", /\bsin tacc|celiac|sin gluten/],
  ["pan dulce", /\bpan(es)? dulce/],
  ["regalo", /\bregalo|canasta/],
  ["pistacho", /\bpistach/],
  ["proteína", /\bproteina|whey|creatina/],
];

/** Cuenta qué productos se nombran en los mensajes de clientes. Devuelve los más pedidos primero. */
export function demanda(textos: string[]): { que: string; veces: number }[] {
  const sinTildes = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const cuenta = new Map<string, number>();
  for (const texto of textos) {
    const t = sinTildes(texto);
    for (const [que, re] of PRODUCTOS_DEMANDA) if (re.test(t)) cuenta.set(que, (cuenta.get(que) ?? 0) + 1);
  }
  return [...cuenta.entries()].map(([que, veces]) => ({ que, veces })).sort((a, b) => b.veces - a.veces);
}
