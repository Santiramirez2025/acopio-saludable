// Qué combo ofrecer según lo que busca la persona.
//
// La estrategia de venta es combo primero: un combo resuelve la compra entera, llega solo a la
// compra mínima y tiene 5% de descuento. El modelo no tiene que adivinar cuál: el tema se
// detecta acá, con reglas fijas, y el vendedor recibe los combos ya ordenados.
//
// Puro (sin base): se prueba sin gastar nada.

export type Tema = { id: string; nombre: string; patron: RegExp; slugs: string[] };

/** El orden importa: gana el primero que coincide. Sin TACC va antes que todo lo demás. */
export const TEMAS: Tema[] = [
  { id: "sintacc-dulce", nombre: "sin TACC dulce", patron: /\b(alfajor|merienda|galletit|dulce)\w*\b.*\b(sin tacc|sin gluten|celiac)|\b(sin tacc|sin gluten|celiac)\w*\b.*\b(alfajor|merienda|galletit|dulce)/, slugs: ["merienda-sin-tacc", "alfajores-sin-tacc", "caja-sin-tacc-del-mes"] },
  { id: "sintacc", nombre: "sin TACC", patron: /\b(sin tacc|stacc|s\/tacc|sin gluten|celiac|libre de gluten)/, slugs: ["caja-sin-tacc-del-mes", "alacena-sin-tacc", "merienda-sin-tacc"] },
  { id: "gym", nombre: "gimnasio y proteína", patron: /\b(gym|gimnas|proteina|whey|creatina|entren|musculo|masa muscular|fitness|deport)/, slugs: ["arranque-gym", "despensa-del-gym"] },
  { id: "suplementos", nombre: "suplementos", patron: /\b(suplement|magnesio|colageno|vitamina|maca|omega|espirulina|moringa)/, slugs: ["duo-magnesio"] },
  { id: "desayuno", nombre: "desayuno", patron: /\b(desayun|granola|avena|chia|cereal|muesli|pasta de mani|mantequilla de mani)/, slugs: ["desayuno-30-dias"] },
  { id: "frutos-secos", nombre: "frutos secos y semillas", patron: /\b(fruto|frutos secos|almendra|nuez|nueces|mani|castana|pasa|pasas|datil|semilla|girasol|zapallo|mix)/, slugs: ["alacena-de-frutos-secos", "despensa-4-kilos"] },
  { id: "especias", nombre: "especias", patron: /\b(especia|condimento|oregano|pimenton|comino|curry|curcuma|especiero)/, slugs: ["especiero-completo"] },
  { id: "reposteria", nombre: "repostería", patron: /\b(reposter|harina|premezcla|bizcochuelo|torta|budin|cacao|azucar mascabo)/, slugs: ["reposteria-casera"] },
  { id: "picada", nombre: "picada y snacks", patron: /\b(picada|snack|aperitivo|copetin|para picar)/, slugs: ["picada-y-snacks"] },
  { id: "legumbres", nombre: "legumbres y guisos", patron: /\b(legumbre|lenteja|garbanzo|poroto|arroz|guiso|arveja|quinoa)/, slugs: ["guisos-y-legumbres"] },
];

/** El combo de entrada: el único que llega al mínimo sin pasar de $40.000. Es la red cuando el resto parece caro. */
export const COMBO_ENTRADA = "despensa-4-kilos";

const sinTildes = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function temaDe(texto: string): Tema | null {
  const t = sinTildes(texto);
  return TEMAS.find((x) => x.patron.test(t)) ?? null;
}
