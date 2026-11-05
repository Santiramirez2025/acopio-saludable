"use client";

import { pesosCliente } from "./Carrito";
import { linkWhatsapp } from "@/lib/pedido-calculos";

/** El carrito armado como mensaje: el vendedor lo recibe y cierra el pedido (dirección y pago) en la charla. */
export function mensajePedido(lineas: { nombre: string; cantidad: number; subtotal: number }[], subtotal: number): string {
  const detalle = lineas.map((l) => `• ${l.cantidad} × ${l.nombre}: ${pesosCliente(l.subtotal)}`).join("\n");
  return `Hola! Quiero hacer este pedido de la web:\n${detalle}\nTotal: ${pesosCliente(subtotal)}`;
}

/** Botón «Pedir por WhatsApp» del carrito y del checkout. Lo cuenta el medidor global por `data-medir` (ver Medicion.tsx). */
export function PedirWhatsapp({ numero, lineas, subtotal }: { numero?: string | null; lineas: { nombre: string; cantidad: number; subtotal: number; disponible: boolean }[]; subtotal: number }) {
  const href = numero ? linkWhatsapp(numero, mensajePedido(lineas.filter((l) => l.disponible), subtotal)) : null;
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn-whatsapp w-full" data-medir="whatsapp_desde_carrito">
      Pedir por WhatsApp
    </a>
  );
}
