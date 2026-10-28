// La oferta del Equipo de Agentes (sin dependencias de servidor: la usan la landing y el formulario).
export const PRECIO_IMPLEMENTACION = 4_900_000;
export const PRECIO_MENSUAL = 490_000;
/** Implementaciones que Santiago puede tomar por mes (lo dijo él el 28/10): es el cupo real que se comunica. */
export const CUPO_MENSUAL = 5;
export const WA_TEXTO_SISTEMA = "Hola, quiero el equipo de agentes de IA para mi empresa #agentes";
export const VIDEO_CORTO = "https://www.youtube.com/shorts/HPrTJs7tjSA";
export const VIDEO_RECORRIDO = "https://www.youtube.com/watch?v=RjzrZFdsfas";

// Freno al formulario público de /agentes: cada envío escribe en la base y le manda un WhatsApp a Santiago,
// así que un robot podría llenarle el teléfono (y gastar mensajes). Tope general cada 15 minutos y tope por
// teléfono por día; quien se pase sigue igual por WhatsApp, que es donde Marcos atiende de verdad.
export const LEADS_MAX_15MIN = 5;
export const LEADS_MAX_TELEFONO_DIA = 2;
export function admiteLead(ultimos15min: number, mismoTelefonoHoy: number): boolean {
  return ultimos15min < LEADS_MAX_15MIN && mismoTelefonoHoy < LEADS_MAX_TELEFONO_DIA;
}

// ── Prospección por email (pura, se prueba sin red) ──────────────────────────────────────────────

/** Mails por día: 1 a 1, personalizados. Más que esto ensucia el dominio y deja de ser 1 a 1. */
export const MAILS_POR_DIA = 12;
/** Días hábiles antes del único seguimiento. Después de 2 mails, nunca más. */
export const DIAS_SEGUIMIENTO = 4;

/** A quiénes no se les escribe nunca: la familia, clientes, y los negocios a los que Santiago les hizo demos. */
const EXCLUIDOS = [
  /azul ?colchones/i, /colch[oó]n ?f[aá]cil/i, /piero/i, /mindel/i, /acopio/i,
  /cidi/i, /mottura/i, /genos/i, /panda/i, /siso/i, /capilea/i, /los cedros/i, /challao/i,
  /monkey/i, /banana'?s/i, /penny ?nail/i, /vernola/i, /mujer financiera/i, /magnetix/i,
  /rinc[oó]n rojo/i, /v[ée]rtice/i, /lozita/i, /betonmac/i, /andina motors/i, /p[aá]del del sur/i,
];
export function excluido(empresa: string, dominio: string): boolean {
  return EXCLUIDOS.some((r) => r.test(empresa) || r.test(dominio));
}

/** Casillas a las que no se manda prospección (no son de una empresa o no las lee nadie). */
export function emailValido(email: string): boolean {
  if (!/^[^\s@<>()]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(email)) return false;
  return !/^(no-?reply|noreply|postmaster|abuse|mailer-daemon|privacy|legal)@/i.test(email);
}

export function dominioDe(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

/** Lunes a viernes de 9 a 18, hora de Córdoba: un mail de negocios se lee en horario de trabajo. */
export function enVentanaDeEnvio(ahora = new Date()): boolean {
  const ar = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Argentina/Cordoba" }));
  const dia = ar.getDay();
  const h = ar.getHours();
  return dia >= 1 && dia <= 5 && h >= 9 && h < 18;
}

/** Días hábiles entre dos fechas (para el seguimiento). */
export function diasHabiles(desde: Date, hasta: Date): number {
  let n = 0;
  const d = new Date(desde);
  while (d < hasta) {
    d.setDate(d.getDate() + 1);
    if (d <= hasta && d.getDay() !== 0 && d.getDay() !== 6) n++;
  }
  return n;
}
