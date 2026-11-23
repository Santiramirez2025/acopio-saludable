// «¿Cómo pago?» de las páginas públicas (fiestas, locales, sin TACC), en un solo lugar.
// Política de Santiago (21/11): en Villa Carlos Paz y la zona de reparto propio, pagar al recibir
// (efectivo o transferencia) es la opción normal; Córdoba Capital y Malagueño también pagan al
// recibir (22/11). Por correo al resto del país, siempre pago anticipado.
// El checkout de la web hoy solo ofrece Mercado Pago y transferencia: por eso el pago al recibir
// se pide por WhatsApp. Estas respuestas van también al JSON-LD FAQPage: tienen que coincidir con
// lo que pasa de verdad (nunca «el pedido sale cuando el pago está acreditado» para la zona).

export const PAGO_ZONA =
  "En Villa Carlos Paz y la zona de reparto pagás al recibir el pedido, en efectivo o por transferencia: pedilo por WhatsApp y lo pagás cuando te llega.";
export const PAGO_WEB = "Si comprás por la web, pagás con Mercado Pago (tarjeta, débito o dinero en cuenta) o por transferencia.";
export const PAGO_CORREO = "Para envíos por correo al resto del país, el pago es por adelantado, con Mercado Pago o transferencia.";

/** Respuesta a «¿Cómo pago?». `reparto`: la página habla de un lugar donde llega nuestro reparto. */
export function textoComoPagar({ reparto = true }: { reparto?: boolean } = {}): string {
  return reparto ? `${PAGO_ZONA} ${PAGO_WEB} ${PAGO_CORREO}` : `${PAGO_CORREO} Si estás en Villa Carlos Paz, la zona de reparto o Córdoba Capital, pagás al recibir.`;
}
