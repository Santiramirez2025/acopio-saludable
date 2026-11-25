// 24/11: Vilma Chaig dijo «Por ahora no quiero nada» (23/11) y el seguimiento automático de las 11 h igual le mandó
// «¿Seguís interesado? Te lo podemos llevar el jueves». Contestó «No hice ningún pedido». A María Laura (AS-172), que
// dijo «No» por el envío, también le siguieron escribiendo. Regla: si el último mensaje del cliente es un no, ningún
// automático por iniciativa nuestra (seguimiento, recordatorio, reactivación) le vuelve a escribir.

import { noPorAhora, postergaCompra } from "./whatsapp-interactivo";

function plano(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

const NO_QUIERE =
  /\b(no (quiero|quiere|quisiera|necesito|me interesa|nos interesa|estoy interesad[oa]|hice (ningun|el|un) pedido|pedi nada|me escrib\w*|me manden|molesten)|por ahora no|ahora no|por el momento no|ya compre|dame de baja|de baja|no gracias|me confundi\w*|equivocad[oa])\b/;

/** true si el último mensaje del cliente rechaza o posterga: no se le manda un automático. */
export function rechazaContacto(texto: string | null | undefined): boolean {
  if (!texto) return false;
  const t = plano(texto);
  if (!t) return false;
  // «No», «No.», «no gracias», «nono»: un no a secas.
  if (/^(no+|nono|no no|nop|nah)( gracias| muchas gracias| x ahora| por ahora)?$/.test(t)) return true;
  if (noPorAhora(texto) || postergaCompra(texto)) return true;
  // Un «no» dentro de una pregunta («¿no tienen sin maní?») no es un rechazo.
  if (texto.includes("?")) return false;
  return NO_QUIERE.test(t);
}
