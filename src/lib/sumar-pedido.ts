/**
 * 27/11 (seguridad): ¿se puede sumar lo que pide el cliente al MISMO pedido ya tomado?
 *
 * Solo si todavía no está cobrado. Si el pedido ya figura como pagado (PAGADO o con pagadoAt: Mercado Pago aprobado o
 * transferencia que confirmó Santiago), sumarle ítems sube el total pero el pedido sigue «pagado»: el repartidor ve
 * «pagado» y lo agregado se entrega sin cobrar la diferencia. En ese caso no se suma solo: queda el aviso para Santiago
 * y el resto sigue como siempre (carrito aparte, que se cobra aparte). Puro.
 */
export function puedeSumarAOrden(o: { estado: string; pagadoAt?: Date | string | null }): boolean {
  return o.estado === "PENDIENTE_PAGO" && !o.pagadoAt;
}

/** ¿Hay que avisarle a Santiago un cambio que no se cargó solo? Pedido tomado, sin salir y (si está cobrado) siempre. */
export function avisarCambioNoCargado(estado: string | null | undefined): boolean {
  return estado === "PENDIENTE_PAGO" || estado === "PAGADO";
}
