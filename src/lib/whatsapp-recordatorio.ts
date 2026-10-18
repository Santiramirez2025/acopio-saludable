// Recordatorio a quien dejó de contestar.
//
// Un solo mensaje corto, 3 horas o más después de la última respuesta del vendedor, y siempre
// entre las 8 y las 21 (hora de Argentina): a la noche no se molesta, se espera a la mañana.
// Solo dentro de las 24 horas desde el último mensaje del cliente, que es la ventana en la que
// WhatsApp deja escribir sin plantilla. Uno por charla: si no contesta, no se insiste.

import { primerNombre, ID, type Saliente } from "./whatsapp-interactivo";

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
  return /^¡?(De nada|Dale)\b/i.test(t) || /te escribe alguien del equipo/i.test(t) || /Tu pedido es el|Anotado:|Ya lo tenemos/i.test(t);
}

type Charla = { nombre: string | null; anuncioTitulo: string | null; pedido: string | null };

/** El mensaje: corto, en plural, con una pregunta y sus respuestas como botones. */
export function planRecordatorio(c: Charla): Saliente {
  const nombre = primerNombre(c.nombre);
  const hola = `¡Hola${nombre ? ` ${nombre}` : ""}!`;
  if (c.pedido && !c.pedido.startsWith("orden:")) {
    // No se le vuelve a preguntar la ciudad: muchas veces ya la dijo (a Jose le pasó).
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

