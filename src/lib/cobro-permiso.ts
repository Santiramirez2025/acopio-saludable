// Quién puede dejar un pedido como cobrado. Pasar a PAGADO o a ENTREGADO un pedido sin pago registra
// el cobro (Entregado = cobrado, regla de Santiago 29/10). Eso lo hace solo Santiago con su sesión
// (panel, chat del panel con su «sí») o su WhatsApp; un agente con la clave compartida no, porque la
// clave está escrita en los prompts de todas las tareas programadas y un contenido externo que manipule
// a un agente podría dejar como cobrado un pedido que nadie cobró (Rodri, 30/10 y 1/11).
export function cobroRequiereSesion(estado: string, yaPagado: boolean): boolean {
  return !yaPagado && (estado === "PAGADO" || estado === "ENTREGADO");
}
