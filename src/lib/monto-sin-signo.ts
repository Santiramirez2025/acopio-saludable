// Un agente que manda el texto con curl entre comillas dobles pierde el «$2» de «$24.000»:
// bash lo toma como variable vacía y al cliente le llega «4.000». Pasó el 20/11 con dos
// clientes (Trío «4.000 al recibir», mix «2.500 el kilo»). Si un monto en pesos aparece sin
// el signo, el mensaje se frena antes de salir y se le explica al agente cómo mandarlo.

/** Devuelve el primer monto con punto de miles que no lleva «$» adelante, o null. */
export function montoSinSigno(texto: string): string | null {
  const re = /(^|[^\d$.,])(\d{1,3}(?:\.\d{3})+)(?![\d.,])(?!\s*(?:kg|kilos?|g|gr|grs|gramos|km|metros|m)\b)/giu;
  for (const m of texto.matchAll(re)) {
    const antes = texto.slice(0, (m.index ?? 0) + m[1].length);
    if (/\$\s*$/.test(antes)) continue;
    return m[2];
  }
  return null;
}
