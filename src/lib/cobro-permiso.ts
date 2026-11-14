// Quién puede dejar un pedido como cobrado. Pasar a PAGADO o a ENTREGADO un pedido sin pago registra
// el cobro (Entregado = cobrado, regla de Santiago 29/10). Eso lo hace solo Santiago con su sesión
// (panel, chat del panel con su «sí») o su WhatsApp; un agente con la clave compartida no, porque la
// clave está escrita en los prompts de todas las tareas programadas y un contenido externo que manipule
// a un agente podría dejar como cobrado un pedido que nadie cobró (Rodri, 30/10 y 1/11).
export function cobroRequiereSesion(estado: string, yaPagado: boolean): boolean {
  return !yaPagado && (estado === "PAGADO" || estado === "ENTREGADO");
}

// 14/11 (Rodri): pasar un pedido a «cobrar al entregar» (AL_RECIBIR) lo manda a la pizarra de armado sin pago.
// La regla de Santiago (12/11) lo permite solo en la zona de reparto propio y con un pedido que todavía espera
// el pago. Con la clave compartida un agente no lo puede hacer fuera de esa zona ni sobre un pedido que ya
// pagó, se canceló o salió; Santiago con su sesión sí (decide al salir).
export function alRecibirBloqueo(
  pedido: { estado: string; medioPago: string; pagado: boolean },
  zona: "propia" | "capital" | "correo" | null,
): string | null {
  if (pedido.medioPago === "AL_RECIBIR") return null;
  if (pedido.pagado) return "el pedido ya está pagado: no se cobra al entregar";
  if (pedido.estado !== "PENDIENTE_PAGO") return `el pedido está ${pedido.estado}: solo un pedido que espera el pago pasa a cobrarse al entregar`;
  if (zona !== "propia" && zona !== "capital") return "fuera de la zona de reparto propio se cobra antes (o falta la ciudad): lo decide Santiago desde el panel";
  return null;
}
