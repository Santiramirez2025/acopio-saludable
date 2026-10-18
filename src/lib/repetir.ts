import { enlacePedido } from "./pedido-enlace";

/** El mismo pedido como enlace al carrito: los combos vuelven como combo, el resto producto por producto. */
export function enlaceRepetir(items: { codigo: string; cantidad: number; comboSlug: string | null }[]): string {
  const combos = [...new Set(items.filter((i) => i.comboSlug).map((i) => i.comboSlug as string))];
  return enlacePedido([
    ...combos.map((slug) => ({ tipo: "combo" as const, id: slug, cantidad: 1 })),
    ...items.filter((i) => !i.comboSlug).map((i) => ({ tipo: "producto" as const, id: i.codigo, cantidad: i.cantidad })),
  ]);
}

/** Código de recomendación de un pedido: corto, sin datos personales, derivado del token. */
export function codigoAmigo(token: string): string {
  return token.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toLowerCase();
}
