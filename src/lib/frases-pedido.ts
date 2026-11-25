// El bot no puede dar por hecho un pedido que no existe (prompt, regla del 22/11). Igual pasó:
// 23/11 (Mayra, anuncio «3 kilos por $24.000»): «Ya lo dejamos cargado: el Trío trae…» sin pedido creado,
// y el Cerrador lo marcó como error. Mientras la charla no tenga un pedido (código AS-…), esas frases
// se sacan del texto antes de mandarlo. Las preguntas («¿Te lo separamos?», «¿Te lo dejo listo?») quedan.
// Puro: se prueba sin base.

const HECHO = "(?:cargado|armado|separado|listo|agendado|anotado|reservado|guardado)";
const FRASES: RegExp[] = [
  new RegExp(`(?:ya )?(?:te |se )?lo dejamos ${HECHO}`, "gi"),
  new RegExp(`(?:ya )?(?:te |tu pedido |el pedido )?(?:lo )?qued(?:ó|o|a) ${HECHO}`, "gi"),
  /(?:ya )?te lo (?:separ[ée]|separamos|anot[ée]|anotamos|agend[ée]|agendamos|reserv[ée]|reservamos)/gi,
];

/** Texto con algún código de pedido (AS-00173, AS-173). */
export function hayPedidoEnCharla(textos: string[]): boolean {
  return textos.some((t) => /\bAS-?\d{2,}\b/i.test(t));
}

/** Saca «ya lo dejamos cargado», «quedó separado», «te lo anoté»… cuando todavía no hay pedido. */
export function sinPedidoDadoPorHecho(texto: string, hayPedido: boolean): string {
  if (hayPedido) return texto;
  let t = texto;
  for (const re of FRASES) {
    t = t.replace(re, (m, ...args) => {
      const off = args[args.length - 2] as number;
      const s = args[args.length - 1] as string;
      const desde = Math.max(s.lastIndexOf(".", off), s.lastIndexOf("!", off), s.lastIndexOf("?", off), s.lastIndexOf("\n", off));
      // Dentro de una pregunta («¿Te lo separamos?») no se toca.
      if (s.slice(desde + 1, off).includes("¿")) return m;
      return "\u0000";
    });
  }
  if (!t.includes("\u0000")) return sinAnotadoSuelto(texto);
  t = t
    .replace(/\u0000\s*(?:y\s+)?[:,.!]?\s*/g, "\u0001")
    .replace(/(^|[.!?\n]\s*|[¡]\s*|🤖\.?\s*)\u0001(\S)/gu, (_m, pre: string, c: string) => `${pre}${c.toUpperCase()}`)
    .replace(/\u0001/g, "")
    .replace(/ {2,}/g, " ")
    .replace(/\s+([?.!,:])/g, "$1")
    .replace(/¡\s*([.!])/g, "")
    .trim();
  return sinAnotadoSuelto(t);
}

// 25/11 (Elvira, antes del AS-179): «Dale, Elvira, lo anotamos.» y «Gracias, Elvira, ya anotamos la entrega en 9 de
// Julio 90» sin pedido creado. La frase entera que afirma que anotamos o agendamos se saca (las preguntas quedan).
const ANOTADO = /\b(?:lo |la |los |las |ya )?(?:anotamos|anot[ée]|agendamos|agend[ée]|reservamos|reserv[ée])\b|\b(?:queda|qued[óo]|est[áa]) (?:anotad|agendad)[oa]s?\b/i;
function sinAnotadoSuelto(texto: string): string {
  // Con los separadores: una lista en renglones sigue en renglones.
  const partes = texto.split(/((?<=[.!?])[ \t]+|\n)/);
  let saco = false;
  let t = "";
  for (let i = 0; i < partes.length; i += 2) {
    const f = partes[i];
    if (f && !f.includes("¿") && ANOTADO.test(f)) saco = true;
    else t += f + (partes[i + 1] ?? "");
  }
  if (!saco) return texto;
  t = t.replace(/ {2,}/g, " ").trim();
  return t || "Para dejártelo anotado me falta confirmar el pedido. ¿Te lo dejo listo?";
}
