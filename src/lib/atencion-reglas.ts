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
export function notaPedidoSinPagar(medioPago: string | null | undefined, yaMandoComprobante = false): string {
  if (medioPago === "AL_RECIBIR") return " Es un pedido viejo acordado para pagar al recibir: se respeta, no le pidas que pague antes ni se lo ofrezcas a nadie más.";
  // AS-00043 (5/11): mandó el comprobante 17:24 y le preguntamos tres veces si ya había transferido.
  if (yaMandoComprobante) return " YA MANDÓ EL COMPROBANTE, falta que Santiago vea la acreditación. No le preguntes si transfirió ni si lo mandó, no le pidas nada, no pongas botones y no preguntes «¿algo más?». Si da un horario o un dato, guardalo y cerrá solo con: «Anotado. Ya tenemos tu comprobante: apenas Santiago vea la acreditación te confirmamos por acá.». No digas que está pagado.";
  return " TODAVÍA NO PAGÓ: el pedido sale recién con el pago acreditado. No digas que va en el reparto ni que Santiago le confirma el horario; si pregunta cuándo llega, decile que se coordina apenas se acredite el pago. Si dice que paga más tarde, no insistas.";
}

/** El historial del pedido dice que llegó un comprobante (lo anota notaComprobante; no significa cobrado). */
export function yaMandoComprobante(notasDelPedido: (string | null | undefined)[]): boolean {
  return notasDelPedido.some((n) => /^Mandó comprobante/.test(n ?? ""));
}

/**
 * Pedido que ya salió. ENVIADO no quiere decir «hoy»: AS-00042 estaba ENVIADO desde el 3/11 y el 6/11 esta
 * nota le hizo decir a Yol que los dátiles salían «en el reparto de hoy». No había reparto.
 */
const SI_FALTA_ALGO = " Si dice que no le llegó o que le falta algo: preguntá qué falta si no lo dijo y usá pasar_a_whatsapp. No prometas salida, día ni hora.";
export function notaPedidoQueSalio(estado: string | null | undefined): string {
  if (estado === "ENTREGADO") return ` YA LO RECIBIÓ: si agradece o comenta, agradecé corto y cálido y nada más. No digas que está agendado, no ofrezcas avisar cuando salga y no mandes fotos de cómo llega.${SI_FALTA_ALGO}`;
  if (estado === "ENVIADO") return ` Figura ENVIADO: ya salió y puede que ya lo tenga. No sabés cuándo ni en qué reparto: no digas que sale hoy, que está en el reparto ni que va en camino.${SI_FALTA_ALGO} Si quiere sumar algo es un pedido nuevo, no va «en el mismo reparto».`;
  return "";
}

/** El plazo de entrega es para lo que todavía no salió: a un pedido ENVIADO o ENTREGADO no se le promete. */
export function notaPlazoEntrega(estado: string | null | undefined): string {
  if (estado === "ENVIADO" || estado === "ENTREGADO") return "";
  return " Si pregunta cuándo se lo llevan: entregamos en 24 a 48 h hábiles (domingos no hay reparto); el día del reparto le avisamos a la mañana y el chico del reparto le escribe para coordinar el horario. No prometas un día ni una hora exactos.";
}

/**
 * Solo dietéticas y kioscos revenden. A Be Fruit (cafetería), Posada de los Pájaros (desayuno) y C&W (cabañas)
 * les dijimos «la revendés a...» y Leo los corrigió a mano (informe de Nico, 5/11).
 */
export function rubroRevende(nicho: string): boolean {
  return nicho === "dieteticas" || nicho === "kioscos";
}

export function instruccionPedidoNegocio(nicho: string): string {
  return rubroRevende(nicho)
    ? "Mostrale 3 o 4 de estos productos EN EL MENSAJE, cada uno en su renglón con precio y cuánto gana revendiéndolo, y cerrá con UNA pregunta («¿Te armo este pedido?» o «¿Qué le sumarías?»). No mandes links ni la página del rubro. Si dice que sí, usá agregar_al_pedido con esos códigos."
    : "Este negocio USA la mercadería, no la revende: mostrale 3 o 4 de estos productos EN EL MENSAJE con precio por kilo, sin hablar de reventa ni de ganancia, y preguntá UNA cosa: «¿A cuánto estás pagando hoy el kilo de [uno de estos productos]?». No mandes links ni la página del rubro. Si dice que quiere pedir, usá agregar_al_pedido con esos códigos.";
}

/** Pie de la foto de un combo: que el precio llegue aunque el texto que sigue no salga (AS-00043, 5/11). */
export function pieFotoCombo(nombre: string, precio: string, transferencia: string | null): string {
  return transferencia ? `${nombre}: ${precio}, o ${transferencia} por transferencia` : `${nombre}: ${precio}`;
}

/**
 * Nota del historial cuando Santiago marca Entregado sin pago registrado (regla del 29/10: Entregado = cobrado).
 * AS-00043 pagó por transferencia y el evento decía «Cobrado al entregar», que confunde el control de cobro.
 */
export function notaCobroAlMarcarEntregado(medioPago: string | null | undefined): string {
  if (medioPago === "TRANSFERENCIA") return "Marcado Entregado = cobrado, por transferencia (la acreditación no se verifica en este paso)";
  if (medioPago === "MERCADOPAGO") return "Marcado Entregado = cobrado, por Mercado Pago (la acreditación no se verifica en este paso)";
  return "Cobrado al entregar";
}

/**
 * Duda de confianza: «el tema es la fiabilidad de la entrega, ¿tienen local?» (…6653, 7/11). Esa vez el bot
 * contestó con el resumen del pedido y los botones de pago, y la clienta no pagó. A una duda así se le contesta
 * la duda, sin botones de pago en ese mensaje.
 */
export function esDudaDeConfianza(texto: string): boolean {
  const t = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return (
    /\bfiab|\bconfiabl|\bconfianza\b|\bestafa|\btrucho|\bchanta|\bes (un )?(lugar |sitio |negocio )?seguro\b|\bson (de )?verdad\b|\bson reales\b|\bson confiables\b/.test(t) ||
    /como (se|sabes|se yo|puedo saber) que (me )?(llega|lo traen|lo entregan|es real|no es)/.test(t) ||
    /\bmiedo (a|de) (pagar|que no)|\bdesconf/.test(t)
  );
}
