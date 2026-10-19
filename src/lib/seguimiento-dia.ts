// Qué día se le ofrece la entrega en el seguimiento (puro, para testear).

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** El próximo día de reparto a partir de pasado mañana; el domingo no se reparte. */
export function diaDeEntrega(ahora = new Date()): string {
  const d = new Date(ahora.getTime() - 3 * 3600_000); // hora argentina
  d.setUTCDate(d.getUTCDate() + 2);
  if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  return DIAS[d.getUTCDay()];
}

