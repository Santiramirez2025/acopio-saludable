// Textos del aviso de despacho. Puro (sin base): se prueba sin mandar nada.

import type { Order } from "@prisma/client";
import { numeroPedido } from "./pedido-calculos";
import { pesos } from "./precios";

// 18/11: «¡Gracias por tu compra, Poretti!» (el pedido estaba a nombre «Poretti María Cristina»). Solo un nombre de
// pila que reconocemos; si no, sin nombre.
import { esNombreDePila } from "./nombres-comunes";
function primerNombre(nombre: string): string {
  const n = (nombre.trim().split(/\s+/)[0] ?? "").replace(/[^\p{L}]/gu, "");
  if (!n || !esNombreDePila(n)) return "";
  return n[0].toUpperCase() + n.slice(1).toLowerCase();
}

/** «Ya salió»: solo el aviso y cómo paga. Nada de referidos: no se mezcla con la venta en curso. */
/** `antes`: lo que paga si transfiere antes de que llegue el cadete (17/11: dos precios según cuándo paga). */
export function mensajeDespacho(p: Pick<Order, "id" | "nombre" | "medioPago" | "pagadoAt" | "total">, antes?: { monto: number; alias: string } | null): string {
  const nombre = primerNombre(p.nombre);
  const pago =
    p.pagadoAt
      ? "Ya está pago: no tenés que abonar nada al recibirlo."
      : p.medioPago === "AL_RECIBIR"
        ? `Lo pagás cuando te llega: ${pesos(Number(p.total))}, en efectivo o por transferencia.${antes && antes.monto < Number(p.total) ? ` Si lo transferís antes de que llegue el cadete, te queda en ${pesos(antes.monto)} (alias ${antes.alias}; mandanos el comprobante por acá).` : ""}`
        : `Queda pendiente el pago de ${pesos(Number(p.total))}.`;
  // No «ya salió» (no sabe a qué hora le llega): va en el reparto de hoy y el repartidor le escribe antes.
  return `¡Hola${nombre ? ` ${nombre}` : ""}! 😊 Tu pedido ${numeroPedido(p.id)} ya está en el reparto de hoy. Durante el día te va a escribir por acá el cadete para coordinar la entrega. ${pago}`;
}

/**
 * Gracias al entregar: SOLO con el pedido pagado y entregado.
 * 25/11 (Santiago: «mucho texto… eso del 5% por recomendar no lo mandamos más. Que saquen una foto y nos etiqueten,
 * y ahí sí le damos un 5%, y la republicamos»): un mensaje corto, sin link, que invita a la foto.
 */
export const INSTAGRAM_ACOPIO = "@acopio.saludable";
export function mensajesGracias(p: Pick<Order, "id" | "nombre" | "token">, _sitio?: string): [string] {
  const nombre = primerNombre(p.nombre);
  return [`¡Gracias${nombre ? `, ${nombre}` : ""}! 💚 Que lo disfrutes. Si subís una foto y nos etiquetás en Instagram (${INSTAGRAM_ACOPIO}), la compartimos y tenés 5% en tu próxima compra.`];
}
