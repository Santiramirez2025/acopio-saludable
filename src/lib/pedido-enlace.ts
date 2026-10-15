// Un pedido como enlace: `/carrito?p=3622*2,c-desayuno-30-dias*1`.
//
// Vive acá, sin React, porque lo usan dos mundos: el botón de compartir en el navegador
// y el vendedor de WhatsApp en el servidor, que necesita mandarle a la persona un link
// con el pedido ya armado. Los precios nunca viajan en el enlace: se calculan al abrirlo.

import type { LineaEntrada } from "./tienda-saneo";

export function enlacePedido(lineas: LineaEntrada[]): string {
  return `/carrito?p=${lineas
    .filter((l) => l.cantidad > 0)
    .map((l) => `${l.tipo === "combo" ? "c-" : ""}${encodeURIComponent(l.id)}*${l.cantidad}`)
    .join(",")}`;
}

export function leerPedido(p: string): LineaEntrada[] {
  return p
    .split(",")
    .slice(0, 80)
    .flatMap((t) => {
      const [crudo, n] = t.split("*");
      const cantidad = Math.min(999, Number.parseInt(n ?? "1", 10) || 0);
      if (!crudo || cantidad <= 0) return [];
      const combo = crudo.startsWith("c-");
      return [{ tipo: combo ? ("combo" as const) : ("producto" as const), id: decodeURIComponent(combo ? crudo.slice(2) : crudo), cantidad }];
    });
}
