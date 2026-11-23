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

/** Días sin reparto además de los domingos (AAAA-MM-DD, hora de Argentina). 23/11/2026: feriado, el proveedor no abrió
 *  y Santiago pasó los 21 pedidos al martes. */
export const SIN_REPARTO = new Set<string>(["2026-11-23"]);

function hayReparto(ahoraMs: number, salto: number): boolean {
  const d = new Date(ahoraMs - AR_MS + salto * 86_400_000);
  return d.getUTCDay() !== 0 && !SIN_REPARTO.has(d.toISOString().slice(0, 10));
}

export function avisoReparto(ahoraMs: number): AvisoReparto {
  const local = new Date(ahoraMs - AR_MS);
  const diaSemana = local.getUTCDay();
  const limiteHoy = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), HORA_LIMITE_PAGO) + AR_MS;
  if (hayReparto(ahoraMs, 0) && ahoraMs < limiteHoy) return { dia: "hoy", restaMs: limiteHoy - ahoraMs };
  // Próximo día con reparto (domingos y días de SIN_REPARTO no hay).
  let salto = 1;
  while (!hayReparto(ahoraMs, salto)) salto++;
  return { dia: salto === 1 ? "mañana" : `el ${DIAS[(diaSemana + salto) % 7]}`, restaMs: null };
}

/** Día del próximo reparto DESPUÉS de hoy (lo por encargo llega de La Granja de un día para el otro):
 *  «mañana» de lunes a viernes, «el lunes» el sábado (domingo no hay reparto). */
export function proximoRepartoTrasHoy(ahoraMs: number): string {
  const diaSemana = new Date(ahoraMs - AR_MS).getUTCDay();
  let salto = 1;
  while ((diaSemana + salto) % 7 === 0) salto++;
  return salto === 1 ? "mañana" : `el ${DIAS[(diaSemana + salto) % 7]}`;
}

/**
 * Nota con el día real del reparto para el vendedor de WhatsApp (15/11, Nico y Laura: el domingo el bot le dijo a
 * Miryam «lo llevamos en el reparto de las 16», a María Teresa y a Atilio «sale hoy», y a Nanci le mandó el video
 * «si pagás antes de las 15, hoy lo tenés»). Las instrucciones dicen la regla, pero el modelo no sabe qué día ni qué
 * hora es: esta nota se la dice en cada mensaje.
 */
export function notaRepartoDeHoy(ahoraMs: number): string {
  const local = new Date(ahoraMs - AR_MS);
  const hoy = DIAS[local.getUTCDay()];
  const hora = `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
  const a = avisoReparto(ahoraMs);
  if (a.dia === "hoy")
    return `(REPARTO, solo Carlos Paz y la zona: hoy es ${hoy}, son las ${hora}. Lo que se paga antes de las 15 sale hoy en el reparto de las 16.)`;
  const nombre = DIAS[(local.getUTCDay() + (a.dia === "mañana" ? 1 : 2)) % 7];
  const motivo = local.getUTCDay() === 0 ? "los domingos no hay reparto" : !hayReparto(ahoraMs, 0) ? "hoy no hay reparto (feriado)" : "ya pasaron las 15";
  return `(REPARTO, solo Carlos Paz y la zona: hoy es ${hoy}, son las ${hora} y ${motivo}. Lo próximo sale ${a.dia === "mañana" ? `mañana ${nombre}` : a.dia} desde las 16. No digas «hoy lo tenés», «sale hoy», «en el reparto de hoy» ni «si pagás antes de las 15»: decí «te lo llevo ${a.dia === "mañana" ? `mañana ${nombre}` : a.dia} desde las 16».)`;
}

/** Cierre del mensaje con el alias (Carlos Paz y la zona): «sale hoy en el reparto de las 16» o «sale mañana lunes desde las 16». */
export function textoSalidaReparto(ahoraMs: number): string {
  const a = avisoReparto(ahoraMs);
  if (a.dia === "hoy") return "si llega antes de las 15, sale hoy en el reparto de las 16";
  const dia = new Date(ahoraMs - AR_MS).getUTCDay();
  return `sale ${a.dia === "mañana" ? `mañana ${DIAS[(dia + 1) % 7]}` : a.dia} en el reparto de las 16`;
}

/**
 * Plazo de la zona propia para el checkout y el bot (Laura y Nico, 16/11): el plazo guardado por defecto
 * («24 a 48 hs hábiles») contradecía el reparto diario de las 16 que dice la ficha. Si el plazo guardado es el de
 * por defecto (o está vacío), se dice el día real; si Santiago escribió otro en el panel, manda el suyo.
 */
export function plazoZonaPropia(guardado: string | undefined, ahoraMs: number): string {
  if (guardado && !/24\s*a\s*48|reparto de las 16/i.test(guardado)) return guardado;
  const a = avisoReparto(ahoraMs);
  const dia = new Date(ahoraMs - AR_MS).getUTCDay();
  const nombre = (salto: number) => DIAS[(dia + salto) % 7];
  if (a.dia === "hoy") {
    const sig = proximoRepartoTrasHoy(ahoraMs);
    return `el reparto de hoy a las 16 si se paga antes de las 15 (si no, ${sig === "mañana" ? `mañana ${nombre(1)}` : sig} desde las 16)`;
  }
  return `el reparto de ${a.dia === "mañana" ? `mañana ${nombre(1)}` : a.dia} desde las 16`;
}

/** «2 h 10 min», «45 min». */
export function textoResta(ms: number): string {
  const horas = Math.floor(ms / 3_600_000);
  const minutos = Math.max(1, Math.floor((ms % 3_600_000) / 60_000));
  return `${horas > 0 ? `${horas} h ` : ""}${minutos} min`;
}

/** Hora pactada en las notas del pedido («a las 19», «19 hs», «19:30»); si no hay, la del reparto (16). */
export function horaSalidaPactada(notas: string | null | undefined): number {
  const m = (notas ?? "").match(/\b(?:a\s+partir\s+de\s+las|a\s+las|desde\s+las|tipo)\s+(\d{1,2})(?:[:.](\d{2}))?|\b(\d{1,2})(?:[:.](\d{2}))?\s*(?:h|hs|horas)\b/i);
  if (!m) return HORA_REPARTO;
  const h = Number(m[1] ?? m[3]);
  const min = Number(m[2] ?? m[4] ?? 0);
  return h >= 8 && h <= 22 ? h + min / 60 : HORA_REPARTO;
}

function textoHora(h: number): string {
  const min = Math.round((h % 1) * 60);
  return min ? `${Math.floor(h)}:${String(min).padStart(2, "0")}` : String(Math.floor(h));
}

/**
 * Pedido que ya salió en el reparto (Nico, 16/11): con AS-85 en la camioneta, a las 16:01 el bot le dijo a Graciela
 * «como ya pasaron las 15, tu pedido sale mañana martes» y después «¿te llegó todo bien?»; ella entendió que no iba
 * y lo canceló. A Viki (AS-88, esperando en Tanti) le preguntó «¿te llegó todo bien?» antes de la entrega.
 * La nota del día del reparto vale para pedidos nuevos; uno ENVIADO ya va en camino y manda sobre esa nota.
 *
 * Laura, 17/11: Gonza pasa a ENVIADO a las 8:15 los pedidos del reparto de la TARDE, y a las 8:41 el bot le dijo a
 * Quique (AS-105, entrega a las 19) y a Lidia (AS-92, espera en un cruce desde las 16) «el cadete va en camino».
 * Antes de la hora del reparto (o de la pactada en las notas) se dice que está en el reparto de hoy y a qué hora sale;
 * «va en camino» solo después. Y no se nombra a Santiago (regla del 16/11): «el equipo».
 */
export function notaPedidoEnCamino(
  estado: string | null | undefined,
  codigo: string,
  ahoraMs: number = Date.now(),
  notas?: string | null,
): string {
  if (estado !== "ENVIADO") return "";
  const local = new Date(ahoraMs - AR_MS);
  const ahoraH = local.getUTCHours() + local.getUTCMinutes() / 60;
  const salida = horaSalidaPactada(notas);
  const comun = `Esto manda sobre la nota del reparto: no le digas que sale mañana ni otro día, no le cambies el día y no le preguntes si le llegó.`;
  const cambios = `Si quiere cancelar, cambiar la dirección o no va a estar, decile que se lo avisás al equipo ya mismo.`;
  if (ahoraH < salida) {
    const hora = textoHora(salida);
    return `(PEDIDO EN EL REPARTO DE HOY: el pedido ${codigo} de este cliente está en el reparto de hoy, que sale desde las ${hora}. ${comun} Todavía NO va en camino: no digas «va en camino», «ya salió» ni «está llegando», y no le pidas que espere afuera. Decile que su pedido está en el reparto de hoy, sale desde las ${hora} y el cadete le escribe por acá cuando esté llegando. ${cambios})`;
  }
  return `(PEDIDO EN CAMINO: el pedido ${codigo} de este cliente ya salió en el reparto de hoy y el cadete lo está llevando. ${comun} Decile que el cadete va en camino con su pedido y le escribe por acá cuando esté llegando. ${cambios})`;
}
