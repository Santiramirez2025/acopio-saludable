// Reglas puras de la atención por WhatsApp (sin base ni red), separadas para poder probarlas.

import { hablaDeFueraDeZona, PLAZO_CORREO, zonaDeLugar } from "./envio-zona";

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
  if (medioPago === "AL_RECIBIR") return " Es un pedido acordado para pagar al recibir: se respeta, no le pidas que pague antes.";
  // AS-00043 (5/11): mandó el comprobante 17:24 y le preguntamos tres veces si ya había transferido.
  if (yaMandoComprobante) return " YA MANDÓ EL COMPROBANTE, falta que veamos la acreditación. No le preguntes si transfirió ni si lo mandó, no le pidas nada, no pongas botones y no preguntes «¿algo más?». Si da un horario o un dato, guardalo y cerrá solo con: «Anotado. Ya tenemos tu comprobante: apenas veamos la acreditación te confirmamos por acá.». No digas que está pagado.";
  return " TODAVÍA NO PAGÓ: el pedido sale recién con el pago acreditado. No digas que va en el reparto ni que le confirmamos el horario; si pregunta cuándo llega, decile que se coordina apenas se acredite el pago. Si dice que paga más tarde, no insistas.";
}

/**
 * 21/11 (Miguel, AS-00139): pagó por transferencia el 19/11 y mandó el PDF del comprobante, pero el pedido seguía
 * «al recibir» y el sábado el bot le dijo dos veces «lo pagás al recibirlo». Si en la charla hay un comprobante del
 * cliente (archivo o foto que dice comprobante) o le contestamos que lo recibimos, ya pagó: nunca se le cobra de nuevo.
 */
export function charlaTieneComprobante(historial: { de: string; texto: string }[]): boolean {
  return historial.some((h) =>
    h.de === "acopio"
      ? /recibimos (el|tu) comprobante|ya tenemos tu comprobante|gracias por el comprobante/i.test(h.texto)
      : /^\[(archivo|foto|imagen|documento)[^\]]*\].*comprobante|comprobante.*\.(pdf|jpe?g|png)/i.test(h.texto),
  );
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
  if (estado === "ENTREGADO") return ` YA LO RECIBIÓ: si agradece o comenta, agradecé corto y cálido y nada más. No digas que está agendado, no ofrezcas avisar cuando salga y no mandes fotos de cómo llega.${SI_FALTA_ALGO} Si ahora pide algo de nuevo, es un PEDIDO NUEVO que todavía no existe: nunca digas «ya está cargado» ni nombres el código del pedido anterior (22/11, Olga: pidió dátiles y le dijeron «ya está cargado (AS-00034)», su compra de octubre).`;
  if (estado === "ENVIADO") return ` Figura ENVIADO: ya salió y puede que ya lo tenga. No sabés cuándo ni en qué reparto: no digas que sale hoy, que está en el reparto ni que va en camino.${SI_FALTA_ALGO} Si quiere sumar algo es un pedido nuevo, no va «en el mismo reparto».`;
  return "";
}

/** El plazo de entrega es para lo que todavía no salió: a un pedido ENVIADO o ENTREGADO no se le promete. */
export function notaPlazoEntrega(estado: string | null | undefined, ciudad?: string | null, medioPago?: string | null): string {
  if (estado === "ENVIADO" || estado === "ENTREGADO") return "";
  // 20/11 (Claudia, AS-00086 al recibir): «Hoy espero el pedido, confirmen que vienen» y el bot le contestó
  // «si lo pagás antes de las 15, sale con el reparto de hoy». Un pedido al recibir no espera ningún pago.
  if (medioPago === "AL_RECIBIR" && !(ciudad && hablaDeFueraDeZona(ciudad)))
    return " Es al recibir: sale en el reparto de las 16 del día acordado y lo paga cuando lo recibe. Si pregunta si viene, confirmale el día y que el cadete le escribe al llegar. Nunca le hables de pagar antes ni de «antes de las 15».";
  // 13/11: con el pedido de Córdoba Capital la regla de la zona («antes de las 15 sale hoy») no corre.
  if (ciudad && hablaDeFueraDeZona(ciudad))
    return zonaDeLugar(ciudad, null)?.tipo === "capital"
      ? " Este pedido es fuera de Carlos Paz y la zona: sale en 24 a 48 h hábiles, en el viaje a Córdoba. No le digas «sale hoy» ni «si pagás antes de las 15»."
      : ` Este pedido es fuera de Carlos Paz y la zona. No le digas «sale hoy» ni «si pagás antes de las 15».${PLAZO_CORREO}`;
  // 13/11 (Martín): antes decía solo «24 a 48 h, no prometas día ni hora» también a los PENDIENTE_PAGO, y eso
  // contradecía la regla de cobro del 12/11 («pagado antes de las 15, sale hoy a las 16»), justo en la etapa
  // donde esa certeza es lo que hace pagar. Ahora el pedido sin pagar recibe la regla del reparto.
  const correo = ` Fuera de Carlos Paz y la zona (por correo):${PLAZO_CORREO}`;
  if (estado === "PENDIENTE_PAGO")
    return ` Si pregunta cuándo se lo llevan (Carlos Paz y la zona): el reparto sale de lunes a sábado a las 16 (los domingos no hay reparto); si lo paga antes de las 15, sale ese mismo día, y si paga después, al día siguiente de reparto desde las 16. Nunca digas «todos los días». Podés decirlo para cerrar el pago («si lo pagás antes de las 15, hoy a la tarde lo tenés»). No prometas una hora exacta de llegada: el chico del reparto le escribe para coordinar.${correo}`;
  return ` Si pregunta cuándo se lo llevan (Carlos Paz y la zona): sale en el reparto de las 16, de lunes a sábado (los domingos no hay reparto; nunca digas «todos los días»); el día del reparto le avisamos y el chico del reparto le escribe para coordinar el horario. No prometas una hora exacta de llegada.${correo}`;
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
  return transferencia ? `${nombre}: ${transferencia} pagando antes por transferencia, o ${precio} al recibir` : `${nombre}: ${precio}`;
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

// 19/11 (Sandra): mandó la foto del comprobante («monto sin leer», sin evento) y escribió «Ya te transferí» y
// «Ya lo pagué», y el bot le preguntó tres veces más si había transferido y le cambió el día. Lo que dice
// el cliente sobre su pago vale como comprobante: no se le vuelve a pedir.
const DICE_QUE_PAGO = /\b(ya (te |le |les )?(lo |la )?(transf[ei]r[ií]|pagu[eé]|pag[oó]|abon[eé]|deposit[eé])|ac[aá] (est[aá]|va|te paso) (la |el )?(trans?ferencia|comprobante)|te (mand[eé]|pas[eé]) (el )?comprobante|trans?ferencia (hecha|realizada|lista))/i;
export function clienteDiceQuePago(textos: string[]): boolean {
  return textos.some((t) => DICE_QUE_PAGO.test(t) || /parece comprobante/i.test(t));
}

// 19/11 (Sandra, Marina): el equipo le escribió «el cadete va para allá» y una hora después el bot le dijo
// «si lo pagás ahora, te lo llevamos mañana». Si el equipo dijo que va en camino o que llega hoy, las reglas
// del reparto y del pago no corren: se habla solo de eso.
export function equipoDijoQueVa(texto: string | null | undefined): boolean {
  return /(^|[^a-z])(va para all[aá]|va en camino|en camino|llegando|de llegar|a \d+ minutos|estoy afuera|estoy en la ubicaci[oó]n|estoy en la puerta|ya sale|sale hoy|hoy (sale|pasa|te lo llev)|(el )?cadete (ya )?(pasa|va|llega))(?![a-z])/i.test(texto ?? "");
}

// «Dale», «Si dale», «Bueno dale», «Ok», «👍», «🩷»: acuse de recibo. Después de un mensaje nuestro que no
// pregunta nada, no se contesta (19/11, Móni recibió cuatro «Cualquier cosa nos escribís por acá» seguidos).
export function soloAcuse(texto: string): boolean {
  if (/\?|\d/.test(texto)) return false;
  const t = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z\s]/g, " ").replace(/([a-z])\1{2,}/g, "$1").replace(/\s+/g, " ").trim(); // «Buenoooo» = «bueno»
  // 21/11: «Recibido. Gracias.» después del gracias del reparto también es acuse (Miguel recibió otra respuesta).
  return t === "" || /^((si|sii+|bueno|ok|oka|okey|okis|dale|listo|joya|genial|perfecto|barbaro|buenisimo|de una|gracias|muchas|mil|recibido|recibi|llego|lleg[oó]|todo|bien|lo|los|la|te|aca|aqui|espero|esperamos|estare|hermoso|riquisimo|re|lindo|amor|chau|saludos|igualmente)\s?){1,5}$/.test(t);
}

/**
 * 25/11 (Beatriz AS-156: «no venían nueces»; Ricardo AS-153: «no quedé conforme», «las nueces ni con lupa»): un
 * cliente que ya recibió y reclama por la calidad o por algo que faltó. El bot le inventó una explicación («se repone
 * con cajú»), le mandó la lista de precios y le preguntó tres veces «¿Lo dejamos listo?». Un reclamo no se vende:
 * pasa a una persona. Solo mira el texto (el llamador confirma que tiene un pedido recibido). Puro.
 */
export function esReclamoDeProducto(texto: string): boolean {
  const t = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
  const PROD = "(?:nuez|nueces|caju|almendras?|pasas|datiles|mani|semillas|girasol|avellanas?|pistachos?|granola|mix|mezcla|mesclas?|producto|bolsa|bolsita|paquete)";
  return (
    new RegExp(`\\bno (?:venian?|vino|traian?|trajo|habian?|tenian?|estaban?)(?: (?:casi|ninguna|ningun|ni una|las|los|el|la|nada de|una|un))* ${PROD}`).test(t) ||
    new RegExp(`\\b${PROD} no (?:habia|venian?|vino|traian?|trajo|tenian?|estaban?|llegaron|llego)\\b`).test(t) ||
    new RegExp(`\\bfalt(?:o|aba|aban|aron)(?: (?:el|la|los|las|un|una))? ${PROD}`).test(t) ||
    /\bno qued(?:e|amos) conforme|\bni con lupa|\b(?:un|hacer el|hacer un|quiero hacer un|tengo un) reclamo\b|\bquiero reclamar|\branci[oa]s?\b|\bmal estado\b|\bpodrid[oa]s?\b|\bcon bichos\b|\bgorgojo|\bmoho\b|\bvencid[oa]s?\b|\b(?:me |nos )?(?:vino|llego|vinieron|llegaron) (?:roto|rota|rotos|abiert[oa]s?|mal|otra cosa|distinto|equivocado|humed[oa]s?)\b/.test(t)
  );
}

export const textoReclamo = (nombre: string | null) => `Uy, perdón${nombre ? `, ${nombre}` : ""}. Lo veo ya con el equipo y te escribo hoy por acá.`;

// «No vino el cadete», «¿viene o no?», «estará lejos?», «sigo esperando»: alguien espera en la puerta.
export function esperaElPedido(texto: string): boolean {
  return /\b(no (vino|lleg[oó]|pas[oó])( (el|ning[uú]n) (cadete|chico|repartidor))?|viene o no|vienen o no|estar[aá] lejos|sigo esperando|estoy esperando|lo estoy esperando|a qu[eé] hora (viene|llega)|cu[aá]nto (falta|tarda))\b/i.test(texto);
}

/**
 * 24/11 (Santiago, por Ricardo AS-153): «cuando ya se cierra una venta no hacemos más preguntas: le decimos gracias y
 * listo; "¿algo más en que te pueda ayudar?" es molesto». Con el pedido ya tomado, se le saca a la respuesta la
 * pregunta de cortesía del final («¿Te queda alguna duda?», «¿Te queda bien ese horario?», «¿Hay algo más…?»).
 * Las preguntas que piden un dato que falta para entregar (calle, horario, quién recibe) no se tocan. Puro.
 */
export function sinPreguntaDeCortesia(texto: string): string {
  const CORTESIA = /\s*¿[^¿?]*(alguna (otra )?(duda|consulta)|algo m[aá]s|te queda bien|te parece bien|te sirve (ese|el) horario|en qu[eé] (m[aá]s )?te (puedo |podemos )?ayud|necesit[aá]s algo|te gustar[ií]a sumar|quer[eé]s sumar|te avisamos|te aviso (por ac[aá] )?cuando)[^¿?]*\?\s*(\[Botones:[^\]]*\])?\s*$/i;
  let t = texto;
  for (let i = 0; i < 2 && CORTESIA.test(t); i++) t = t.replace(CORTESIA, "").trimEnd();
  return t || texto;
}
