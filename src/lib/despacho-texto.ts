// Textos del aviso de despacho. Puro (sin base): se prueba sin mandar nada.

import type { Order } from "@prisma/client";
import { numeroPedido } from "./pedido-calculos";
import { pesos } from "./precios";
import { codigoAmigo } from "./repetir";

function primerNombre(nombre: string): string {
  const n = nombre.trim().split(/\s+/)[0] ?? "";
  return n && !/cliente/i.test(n) ? n : "";
}

/** «Ya salió»: solo el aviso y cómo paga. Nada de referidos: no se mezcla con la venta en curso. */
export function mensajeDespacho(p: Pick<Order, "id" | "nombre" | "medioPago" | "pagadoAt" | "total">): string {
  const nombre = primerNombre(p.nombre);
  const pago =
    p.pagadoAt
      ? "Ya está pago: no tenés que abonar nada al recibirlo."
      : p.medioPago === "AL_RECIBIR"
        ? `Lo pagás cuando te llega: ${pesos(Number(p.total))}, en efectivo o por transferencia.`
        : `Queda pendiente el pago de ${pesos(Number(p.total))}.`;
  // No «ya salió» (no sabe a qué hora le llega): va en el reparto de hoy y el repartidor le escribe antes.
  return `¡Hola${nombre ? ` ${nombre}` : ""}! 😊 Tu pedido ${numeroPedido(p.id)} ya está en el reparto de hoy. Durante el día te va a escribir por acá el chico del reparto para coordinar la entrega. ${pago}`;
}

/**
 * Gracias + referidos: SOLO con el pedido pagado y entregado. Recién ahí, con la venta cerrada y la
 * experiencia completa, se le ofrece recomendar (5% para el amigo, 5% para él).
 */
export function mensajesGracias(p: Pick<Order, "id" | "nombre" | "token">, sitio: string): [string, string] {
  const nombre = primerNombre(p.nombre);
  const uno = `¡Gracias por tu compra${nombre ? `, ${nombre}` : ""}! 💚 Esperamos que disfrutes tu pedido ${numeroPedido(p.id)}.\n\nUn regalo para vos 🎁 Si nos recomendás, tu amigo tiene 5% en su primera compra y vos 5% en la próxima por cada uno que compre. Reenviale el mensaje de abajo 👇`;
  const dos = `Yo compro la despensa en Acopio Saludable (Villa Carlos Paz): frutos secos, mixes y granolas, y me la traen a casa. Con este link tenés 5% de descuento en tu primera compra 👉 ${sitio}/?ref=amigo-${codigoAmigo(p.token)}`;
  return [uno, dos];
}
