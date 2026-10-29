// Política comercial vigente desde el 28/10/2026 (la decidió Santiago).
// 1. Se cobra ANTES de entregar: transferencia (con descuento) o Mercado Pago / la web. No hay más pago al recibir.
// 2. Prioridad pedidos grandes: no se baja a combos chicos ni se mueve el reparto por pedidos chicos.
// Los pedidos ya tomados «al recibir» antes de este cambio se respetan.

/** false = no se ofrece ni se acepta pagar al recibir en pedidos nuevos. */
export const PAGO_AL_RECIBIR = false;

/** La regla en una línea, para todos los agentes (chat, voz y tareas programadas). */
export const POLITICA_COMERCIAL =
  "POLÍTICA COMERCIAL (desde el 28/10, vale para todo el equipo): 1) Se cobra ANTES de entregar: transferencia (con su descuento) o Mercado Pago / la web. No se ofrece más pagar al recibir; un pedido sale cuando el pago está acreditado. Los pedidos viejos que ya quedaron «al recibir» se respetan. 2) Prioridad pedidos grandes: la entrega sin cargo en Carlos Paz es desde la compra mínima de la zona; abajo de eso no se reparte. Se empuja el combo más grande que le sirva y se completa hasta el mínimo; nunca se baja a un combo chico para cerrar. Santiago no se mueve por pedidos chicos. 3) Proveedores (desde el 28/10): girasol pelado, lino, avena, harina integral, salvado de trigo, gluten y gotas de chocolate se compran en Distribuidora HARINAR (Carlos Paz, catálogo en Pediwa), porque ahí salen 6 a 33% más baratos; todo lo demás (frutos secos, pasas, dátiles, mixes, miel, chía, especias y fécula de mandioca) sigue en La Granja del Centro, que es mejor calidad y más barata. Pablo (compras) controla todos los días GET /analisis?parte=harinar (La Granja en vivo; Harinar con los precios de referencia mientras Pediwa no deje leerlo) y avisa si algo cambia. 4) ENTREGADO = COBRADO (regla de Santiago, 29/10): Santiago marca un pedido como Entregado solo cuando ya cobró, sea cual sea el medio de pago. Un pedido entregado nunca es «cobranza pendiente» ni «entregado sin pago»: no se le reclama al cliente ni se le pide a Santiago que lo cobre. El sistema registra el pago solo al marcarlo Entregado.";
