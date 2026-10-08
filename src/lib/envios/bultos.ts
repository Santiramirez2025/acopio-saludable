import type { Bulto } from "./tipos";

export const MAX_BULTO_G = 25000;
/** Peso que se asume para un producto sin peso cargado (se avisa en el pedido). */
export const PESO_POR_DEFECTO_G = 500;

/**
 * Arma bultos de hasta 25 kg (first-fit decreciente).
 * Una unidad que sola supera el límite viaja en su propio bulto, marcado como excedido.
 */
export function armarBultos(items: { pesoG: number; cantidad: number }[], maxG = MAX_BULTO_G): Bulto[] {
  const unidades: number[] = [];
  for (const i of items) for (let k = 0; k < i.cantidad && unidades.length < 20000; k++) unidades.push(Math.max(1, Math.round(i.pesoG)));
  unidades.sort((a, b) => b - a);
  const bultos: Bulto[] = [];
  for (const peso of unidades) {
    if (peso > maxG) {
      bultos.push({ pesoG: peso, unidades: 1, excedido: true });
      continue;
    }
    const destino = bultos.find((b) => !b.excedido && b.pesoG + peso <= maxG);
    if (destino) {
      destino.pesoG += peso;
      destino.unidades++;
    } else bultos.push({ pesoG: peso, unidades: 1, excedido: false });
  }
  return bultos;
}

/** Caja estimada a partir del peso (los correos piden medidas): ~3 litros por kilo, entre 10 y 60 cm por lado. */
export function medidasEstimadas(pesoG: number): { largo: number; ancho: number; alto: number; volumenCm3: number } {
  const lado = Math.min(60, Math.max(10, Math.round(Math.cbrt((pesoG / 1000) * 3000))));
  return { largo: lado, ancho: lado, alto: lado, volumenCm3: lado ** 3 };
}
