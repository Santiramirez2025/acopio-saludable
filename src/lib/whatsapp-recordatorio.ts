// Recordatorio a quien dejó de contestar.
//
// Un solo mensaje corto, 3 horas o más después de la última respuesta del vendedor, y siempre
// entre las 8 y las 21 (hora de Argentina): a la noche no se molesta, se espera a la mañana.
// Solo dentro de las 24 horas desde el último mensaje del cliente, que es la ventana en la que
// WhatsApp deja escribir sin plantilla. Uno por charla por semana: si no contesta o dice que no, no se insiste.
// Nunca un genérico «¿te quedó alguna duda?» (27/10: salió a +40 personas y no vendió nada): repite el carrito
// que tiene guardado con su total, o propone uno concreto (la Alacena), y cierra con «¿Te la separamos?».
// Sin zona confirmada no promete «sin cargo» ni «mañana»: ofrece decir la ciudad.

import { primerNombre, ID, noPorAhora, postergaCompra, soloAgradece, type Saliente } from "./whatsapp-interactivo";

export const RECORDATORIO = { horasSinRespuesta: 3, ventanaHoras: 23, desde: 8, hasta: 21, porCorrida: 30 } as const;

/** La hora en Argentina (UTC-3, sin horario de verano). */
export function horaArgentina(ahora = new Date()): number {
  return (ahora.getUTCHours() + 21) % 24;
}

export function enHorario(ahora = new Date()): boolean {
  const h = horaArgentina(ahora);
  return h >= RECORDATORIO.desde && h < RECORDATORIO.hasta;
}

/** Cuando el último mensaje del vendedor ya cerró la charla, no se recuerda nada. */
export function cerroLaCharla(ultimoBot: string): boolean {
  const t = ultimoBot.trim();
  return /^¡?(De nada|Dale|Gracias a vos)\b/i.test(t) || /cuando quieras|acá estamos/i.test(t) || /te escribe alguien del equipo/i.test(t) || /Tu pedido es el|Anotado:|Ya lo tenemos/i.test(t);
}

/**
 * El cliente ya dijo que no o pidió tiempo en su último mensaje («Más adelante», «Lo pienso», «Lo veo después»):
 * no se le manda el recordatorio. A MateoRuffo (29/10, «Más adelante») y a Monica («Lo pienso») les volvía a
 * llegar «¿Te lo separamos?» a la mañana siguiente, porque la respuesta sin IA no parecía un cierre.
 */
export function clienteDijoQueNo(ultimoCliente: string | null | undefined): boolean {
  const t = (ultimoCliente ?? "").trim();
  return !!t && (noPorAhora(t) || postergaCompra(t));
}

type Charla = { nombre: string | null; anuncioTitulo: string | null; pedido: string | null };

/**
 * ¿Le toca el recordatorio? Solo a quien tiene un pedido o carrito guardado (y no lo cerró ni dijo que no).
 * Sin carrito no sale: del 31/10 al 1/11 salieron 38 «Para arrancar te propongo la Alacena» / «¿Pudiste ver lo de…?»
 * a charlas sin carrito y volvieron 0 compras y 4 respuestas («No», «Lo veo después» ×2, una automática). A Enrique
 * (dátiles + mix sin maní) y a Gustavo («¿los mix tienen maní?») les llegó la Alacena con el Mix Clásico. Tampoco a quien
 * contestó solo «ok» o «gracias» (regla de Laura del 30/10; a Iris le llegó después de «Ok»).
 */
export function tocaRecordatorio(p: { pedido: string | null; ultimoBot: string | null; ultimoCliente: string | null }): boolean {
  if (!p.pedido || p.pedido.startsWith("orden:")) return false;
  if (cerroLaCharla(p.ultimoBot ?? "")) return false;
  if (clienteDijoQueNo(p.ultimoCliente)) return false;
  if (p.ultimoCliente != null && soloAgradece(p.ultimoCliente.trim())) return false;
  return true;
}


/** Un carrito con su precio real (lo cotiza quien corre el recordatorio). */
export type CarritoCotizado = { total: number; transferencia: number | null; resumen?: string };
/** La propuesta concreta para quien no armó nada: nombre del combo, qué trae y precio real. */
export type OfertaConcreta = CarritoCotizado & { nombre: string };

/** Precio en mensaje: redondeado a la centena, sin centavos. */
function monto(n: number): string {
  return `$${(Math.round(n / 100) * 100).toLocaleString("es-AR")}`;
}

function precioCon(c: CarritoCotizado): string {
  return c.transferencia && c.transferencia < c.total ? `${monto(c.total)} (${monto(c.transferencia)} por transferencia)` : monto(c.total);
}

/** El mensaje: corto, en plural, con una pregunta y sus respuestas como botones. */
export function planRecordatorio(c: Charla, carrito?: CarritoCotizado | null, oferta?: OfertaConcreta | null): Saliente {
  const nombre = primerNombre(c.nombre);
  const hola = `¡Hola${nombre ? ` ${nombre}` : ""}!`;
  if (c.pedido && !c.pedido.startsWith("orden:")) {
    // No se le vuelve a preguntar la ciudad: muchas veces ya la dijo (a Jose le pasó).
    if (carrito && carrito.total > 0) {
      return {
        tipo: "botones",
        cuerpo: `${hola} Te guardamos tu pedido${carrito.resumen ? `: ${carrito.resumen}` : ""}, ${precioCon(carrito)}. ¿Te lo separamos?`,
        botones: [
          { id: `${ID.opcion}Sí, separalo`, titulo: "Sí, separalo" },
          { id: `${ID.opcion}Tengo una duda`, titulo: "Tengo una duda" },
          { id: `${ID.opcion}Lo veo después`, titulo: "Lo veo después" },
        ],
      };
    }
    return {
      tipo: "botones",
      cuerpo: `${hola} Te dejamos el pedido guardado 🙌 ¿Lo cerramos así te llega esta semana?`,
      botones: [
        { id: `${ID.opcion}Sí, cerrémoslo`, titulo: "Sí, cerrémoslo" },
        { id: `${ID.opcion}Tengo una duda`, titulo: "Tengo una duda" },
        { id: `${ID.opcion}Lo veo después`, titulo: "Lo veo después" },
      ],
    };
  }
  const combo = c.anuncioTitulo?.match(/^(.+?)\s+a\s+\$/)?.[1]?.trim();
  if (combo) {
    return {
      tipo: "botones",
      cuerpo: `${hola} ¿Pudiste ver lo de la ${combo}? Si querés te la dejamos lista y te llega a tu casa. ¿Te la separamos?`,
      botones: [
        { id: `${ID.opcion}Sí, separala`, titulo: "Sí, separala" },
        { id: `${ID.opcion}Tengo una duda`, titulo: "Tengo una duda" },
        { id: `${ID.opcion}Lo veo después`, titulo: "Lo veo después" },
      ],
    };
  }
  if (oferta && oferta.total > 0) {
    return {
      tipo: "botones",
      cuerpo: `${hola} Para arrancar te propongo la ${oferta.nombre}${oferta.resumen ? `: ${oferta.resumen}` : ""}, ${precioCon(oferta)}. ¿Te la separamos?`,
      botones: [
        { id: `${ID.opcion}Sí, separala`, titulo: "Sí, separala" },
        { id: `${ID.opcion}Te digo mi ciudad`, titulo: "Te digo mi ciudad" },
        { id: `${ID.opcion}Lo veo después`, titulo: "Lo veo después" },
      ],
    };
  }
  return {
    tipo: "botones",
    cuerpo: `${hola} ¿Te quedó alguna duda? La resolvemos por acá y lo encargás en un minuto.`,
    botones: [
      { id: `${ID.opcion}Quiero encargar`, titulo: "Quiero encargar" },
      { id: `${ID.opcion}Tengo una duda`, titulo: "Tengo una duda" },
      { id: `${ID.opcion}Lo veo después`, titulo: "Lo veo después" },
    ],
  };
}


/**
 * ¿El vendedor dio la venta por hecha? «Agendado», «confirmado», «Gracias por la compra», «Quedó la Despensa…».
 * Si no hay pedido creado, Santiago tiene que enterarse: a Olga (26/10) le dijo «Gracias por la compra» con la
 * dirección y el horario anotados y el pedido nunca llegó al panel.
 */
export function dioPorCerrada(dicho: string): boolean {
  return /agendad|confirmad|gracias por (la|tu) compra|\bqued[oó] (la|el|tu) (pedido|despensa|alacena|combo|mix|kit)/i.test(dicho);
}
