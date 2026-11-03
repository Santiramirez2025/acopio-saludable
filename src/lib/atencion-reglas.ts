// Reglas puras de la atención por WhatsApp (sin base ni red), separadas para poder probarlas.

/**
 * Un mensaje sin texto (foto, audio, archivo) solo pasa al vendedor si ya sabemos qué es.
 * La foto que parece comprobante tiene que llegar con su instrucción: el 2/11 Yol (AS-00042) mandó el
 * suyo y, como no entraba en esta lista, le contestamos «Contame en un mensajito qué estás buscando».
 */
export function llegaAlVendedor(texto: string): boolean {
  if (!texto.startsWith("[")) return true;
  return (
    texto.startsWith("[Mandó una foto:") ||
    texto.startsWith("[Mandó una foto que parece el comprobante") ||
    texto.startsWith("[Mandó un audio que dice:") ||
    texto.startsWith("[Mandó un archivo") ||
    /^\[Mandó (el|un) comprobante/.test(texto)
  );
}

/** Para que el vendedor no le prometa un día equivocado: el 2/11, lunes, le dijo a Daniel «Santiago te escribe el lunes». */
export function hoyEnArgentina(ahora: Date = new Date()): string {
  return ahora.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Cordoba", weekday: "long", day: "numeric", month: "numeric" });
}

/**
 * En qué anda el pedido sin pagar. Se cobra antes de entregar: al que debe no se le dice que va en el
 * reparto (el 2/11 se lo dijimos a Sara, AS-00036, y el 3/11 contestó «no sabía que era primero la transferencia»).
 * Los pedidos viejos «al recibir» se respetan: a esos no se les pide pagar antes.
 */
export function notaPedidoSinPagar(medioPago: string | null | undefined): string {
  if (medioPago === "AL_RECIBIR") return " Es un pedido viejo acordado para pagar al recibir: se respeta, no le pidas que pague antes ni se lo ofrezcas a nadie más.";
  return " TODAVÍA NO PAGÓ: el pedido sale recién con el pago acreditado. No digas que va en el reparto ni que Santiago le confirma el horario; si pregunta cuándo llega, decile que se coordina apenas se acredite el pago. Si dice que paga más tarde, no insistas.";
}
