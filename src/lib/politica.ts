// Política comercial vigente desde el 28/10/2026 (la decidió Santiago).
// 1. Se cobra ANTES de entregar: transferencia (con descuento) o Mercado Pago / la web. No hay más pago al recibir.
// 2. Prioridad pedidos grandes: no se baja a combos chicos ni se mueve el reparto por pedidos chicos.
// Los pedidos ya tomados «al recibir» antes de este cambio se respetan.

/** false = no se ofrece ni se acepta pagar al recibir en pedidos nuevos. */
export const PAGO_AL_RECIBIR = false;

/** La regla en una línea, para todos los agentes (chat, voz y tareas programadas). */
export const POLITICA_COMERCIAL =
  "POLÍTICA COMERCIAL (desde el 28/10, vale para todo el equipo): 1) Se cobra ANTES de entregar: transferencia (con su descuento) o Mercado Pago / la web. No se ofrece más pagar al recibir; un pedido sale cuando el pago está acreditado. Los pedidos viejos que ya quedaron «al recibir» se respetan. 2) Prioridad pedidos grandes: la entrega sin cargo en Carlos Paz es desde la compra mínima de la zona; abajo de eso no se reparte. Se empuja el combo más grande que le sirva y se completa hasta el mínimo; nunca se baja a un combo chico para cerrar. Santiago no se mueve por pedidos chicos.";
