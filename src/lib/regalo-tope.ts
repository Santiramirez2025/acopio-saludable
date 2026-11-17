// Tope por llamada del regalo de recetas (Rodri, 17/11): una sola llamada con la clave de agentes no puede mandar
// la plantilla de marketing a toda la base. Por defecto 20, nunca más de 40; los demás quedan para la próxima tanda
// (el envío es una vez por teléfono). Puro: se prueba sin base.

export const REGALO_TOPE_DEFECTO = 20;
export const REGALO_TOPE_MAX = 40;

export function topeRegalo(cantidad: unknown): number {
  const n = typeof cantidad === "number" ? cantidad : typeof cantidad === "string" && cantidad.trim() ? Number(cantidad) : NaN;
  if (!Number.isFinite(n) || n < 1) return REGALO_TOPE_DEFECTO;
  return Math.min(REGALO_TOPE_MAX, Math.floor(n));
}
