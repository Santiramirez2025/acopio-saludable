// Cambiar el estado de un pedido, con todo lo que eso dispara (cobro al recibir, comprobante, aviso de
// despacho, gracias + referidos). Lo usan el panel (botón) y los agentes (API con clave).
import type { EstadoPedido } from "@prisma/client";
import { prisma } from "./prisma";
import { agradecerConReferidos, avisarDespachoWhatsapp } from "./aviso-despacho";
import { ESTADOS, avisarDespachado, confirmarPago, registrarCobroAlRecibir, registrarPago } from "./pedidos";

export async function aplicarEstadoPedido(
  id: number,
  estado: EstadoPedido,
  { nota = null, tracking = null, silencioso = false }: { nota?: string | null; tracking?: string | null; silencioso?: boolean } = {},
): Promise<void> {
  if (!ESTADOS.some((e) => e.id === estado)) throw new Error("Estado inválido");
  const pedido = await prisma.order.findUniqueOrThrow({ where: { id } });
  if (estado === "PENDIENTE_PAGO" && pedido.estado !== "PENDIENTE_PAGO") throw new Error("Un pedido ya pagado no puede volver a pendiente");
  // El estado del pedido (en compra, preparado, enviado, entregado) y el pago van por separado:
  // mover el pedido NUNCA lo marca como pagado. El pago se registra eligiendo «Pagado» o con el botón
  // «Registrar pago». Única excepción: pago al recibir entregado = cobrado en mano, sin avisarle nada.
  // (El 21/10 pasar a Julieta a Enviado le mandó el comprobante de pago sin haber pagado.)
  const alRecibir = pedido.medioPago === "AL_RECIBIR";
  if (alRecibir && estado === "ENTREGADO" && !pedido.pagadoAt) {
    await registrarCobroAlRecibir(id, nota ?? "Cobrado al entregar");
  } else if (estado === "PAGADO" && !pedido.pagadoAt) {
    if (pedido.estado === "PENDIENTE_PAGO" && !silencioso) await confirmarPago(id, nota ?? (pedido.medioPago === "TRANSFERENCIA" ? "Transferencia verificada" : "Pago confirmado a mano"));
    else await registrarPago(id, nota ?? "Pago registrado a mano");
  }
  // Elegir «Pagado» con el pedido ya en marcha registra el pago pero no lo hace retroceder de estado.
  if (estado === "PAGADO" && pedido.estado !== "PENDIENTE_PAGO") {
    if (tracking) await prisma.order.update({ where: { id }, data: { tracking } });
  } else if (estado !== "PAGADO" || pedido.estado !== "PENDIENTE_PAGO") {
    const cambio = estado !== pedido.estado && !(pedido.estado === "PENDIENTE_PAGO" && estado === "PAGADO");
    await prisma.$transaction([
      prisma.order.update({ where: { id }, data: { estado, tracking: tracking ?? pedido.tracking } }),
      ...(cambio || nota ? [prisma.orderEvent.create({ data: { orderId: id, estado, nota } })] : []),
    ]);
  } else if (tracking) {
    await prisma.order.update({ where: { id }, data: { tracking } });
  }
  // Al despachar, el cliente tiene que enterarse solo: si no, el seguimiento vive únicamente en el panel.
  if (estado === "ENVIADO" && pedido.estado !== "ENVIADO" && !silencioso) {
    await avisarDespachado(id);
    // Por WhatsApp: «ya salió» y cómo paga. Sin referidos: eso va recién con el pedido pagado y entregado.
    const actual = await prisma.order.findUnique({ where: { id } });
    if (actual) await avisarDespachoWhatsapp(actual).catch((e) => console.error("aviso de despacho por WhatsApp falló", e));
  }
  // Pagado y entregado: recién ahí, gracias + referidos.
  if (estado === "ENTREGADO" && pedido.estado !== "ENTREGADO" && !silencioso) {
    const actual = await prisma.order.findUnique({ where: { id } });
    if (actual) await agradecerConReferidos(actual).catch((e) => console.error("gracias con referidos falló", e));
  }
}
