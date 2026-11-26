// x-lo-pidio (Rodri, 26/11): un agente puede saltear el freno de «dos mensajes sin respuesta» declarando que el
// cliente lo pidió en persona o por otro canal. Lo declara el mismo agente, así que el control va en el borde de la
// herramienta (OWASP Agentic ASI02, «tool misuse»): una vez por teléfono cada 24 h, y queda registrado quién lo pidió
// (en CronCorrida, con el teléfono como hash, nunca en claro). El bloqueo y la baja siguen frenando siempre.
import { createHash } from "node:crypto";

export const LO_PIDIO_MIN = 10;
export const LO_PIDIO_TOPE_24H = 1;

/** El motivo declarado, o null si no alcanza para contar como «lo pidió» (menos de 10 letras). */
export function motivoLoPidio(cabecera: string | null): string | null {
  const m = (cabecera ?? "").replace(/\s+/g, " ").trim();
  return m.length >= LO_PIDIO_MIN ? m.slice(0, 160) : null;
}

/** Hash corto del teléfono (últimos 10 dígitos) para contar usos sin guardar el número. */
export function hashTelefono(telefono: string): string {
  const fin = telefono.replace(/\D/g, "").slice(-10);
  return createHash("sha256").update(`lo-pidio:${fin}`).digest("hex").slice(0, 16);
}

/** Lo que se guarda en CronCorrida.detalle: hash del teléfono y el motivo (sin el número). */
export function detalleLoPidio(telefono: string, motivo: string): string {
  return `${hashTelefono(telefono)}·${motivo}`;
}

/** null = pasa; si no, el error para el agente. */
export function decidirLoPidio(usos24h: number): string | null {
  if (usos24h < LO_PIDIO_TOPE_24H) return null;
  return "No salió: x-lo-pidio ya se usó con este teléfono en las últimas 24 h. Un pedido en persona alcanza para un mensaje; para más, esperá a que el cliente conteste por WhatsApp o que Santiago lo mande desde el panel.";
}
