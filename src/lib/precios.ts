// Reglas de precio y margen. Todo en pesos, con números ya redondeados a 2 decimales.

export function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Margen bruto en % = (precio - costo) / precio * 100. */
export function margenPct(precio: number, costo: number): number {
  if (!(precio > 0)) return 0;
  return redondear2(((precio - costo) / precio) * 100);
}

export type LineaCombo = { precio: number; costo: number; cantidad: number };

export type CalculoCombo = {
  precioLista: number;
  precioCombo: number;
  costo: number;
  margenPct: number;
  bloqueado: boolean;
};

/** El precio del combo sale de sus productos con un descuento; nunca puede quedar bajo el margen mínimo. */
export function calcularCombo(lineas: LineaCombo[], descuentoPct: number, margenMinimoPct: number): CalculoCombo {
  const precioLista = redondear2(lineas.reduce((s, l) => s + l.precio * l.cantidad, 0));
  const costo = redondear2(lineas.reduce((s, l) => s + l.costo * l.cantidad, 0));
  const precioCombo = redondear2(precioLista * (1 - descuentoPct / 100));
  const m = margenPct(precioCombo, costo);
  return { precioLista, precioCombo, costo, margenPct: m, bloqueado: m < margenMinimoPct };
}

/** Descuento máximo (en %) que puede tener un combo sin perforar el margen mínimo. */
export function descuentoMaximo(lineas: LineaCombo[], margenMinimoPct: number): number {
  const { precioLista, costo } = calcularCombo(lineas, 0, 0);
  if (!(precioLista > 0) || margenMinimoPct >= 100) return 0;
  const precioMinimo = costo / (1 - margenMinimoPct / 100);
  return Math.max(0, Math.floor((1 - precioMinimo / precioLista) * 10000) / 100);
}

/** Precio por kilo o por litro; null si no hay contenido conocido. */
export function precioPorUnidadBase(precio: number, contenido: number | null, unidad: string | null) {
  if (!contenido || contenido <= 0 || !unidad) return null;
  return { valor: redondear2((precio / contenido) * 1000), etiqueta: unidad === "ml" ? "por litro" : "por kilo" };
}

export function pesos(n: number): string {
  // Sin decimales cuando el importe es redondo ($ 200.000), con dos cuando no ($ 8.983,92).
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}
