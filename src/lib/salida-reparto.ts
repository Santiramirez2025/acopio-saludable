// Reparto propio en Carlos Paz y la zona (regla de Santiago, 12/11): sale todos los días a las 16,
// salvo domingo. Lo que se paga antes de las 15 sale ese mismo día; lo que se paga después, en el reparto siguiente.
// Es la misma regla que usa el vendedor de WhatsApp (notaPlazoEntrega): la web y el bot dicen lo mismo.

export const HORA_LIMITE_PAGO = 15;
export const HORA_REPARTO = 16;
const AR_MS = 3 * 3_600_000; // Argentina, UTC−3 sin horario de verano

export type AvisoReparto = {
  /** "hoy" | "mañana" | "el lunes" … (día en que sale el reparto). */
  dia: string;
  /** Si sale hoy: milisegundos que quedan para pagar a tiempo. */
  restaMs: number | null;
};

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function avisoReparto(ahoraMs: number): AvisoReparto {
  const local = new Date(ahoraMs - AR_MS);
  const diaSemana = local.getUTCDay();
  const limiteHoy = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), HORA_LIMITE_PAGO) + AR_MS;
  if (diaSemana !== 0 && ahoraMs < limiteHoy) return { dia: "hoy", restaMs: limiteHoy - ahoraMs };
  // Próximo día con reparto (domingo no hay).
  let salto = 1;
  while ((diaSemana + salto) % 7 === 0) salto++;
  return { dia: salto === 1 ? "mañana" : `el ${DIAS[(diaSemana + salto) % 7]}`, restaMs: null };
}

/** «2 h 10 min», «45 min». */
export function textoResta(ms: number): string {
  const horas = Math.floor(ms / 3_600_000);
  const minutos = Math.max(1, Math.floor((ms % 3_600_000) / 60_000));
  return `${horas > 0 ? `${horas} h ` : ""}${minutos} min`;
}
