// Precio por canal (Mercado Libre, PedidosYa): lo que hay que cobrar ahí para que a Acopio le quede
// lo mismo que vendiendo en la web. Puro (sin base): se prueba sin gastar.
//
// Mercado Libre Argentina (verificado oct/2026, revisar cada tanto):
// · comisión Clásica en Alimentos 11,8% (Premium 14,8%), con 21% de IVA encima;
// · cargo fijo por unidad debajo de $33.000 ($1.330 / $2.740 / $3.320), también con IVA;
// · desde $33.000 el envío es gratis para el comprador y lo paga el vendedor (estimado aparte);
// · Ingresos Brutos ~3% sobre lo facturado.
// PedidosYa: 25% a 35% según la logística (se toma 30% + IVA, con su repartidor).
// Rappi: comisión de ~28% a 35% para comercios chicos con su repartidor (se toma 32% + IVA).

export type Canal = "mercadolibre" | "mercadolibre-premium" | "pedidosya" | "rappi";

export const REGLAS = {
  iva: 0.21,
  iibb: 0.03,
  ml: { clasica: 0.11, premium: 0.14, umbralEnvioGratis: 33000, envioVendedor: 9000, fijos: [[15000, 1330], [25000, 2740], [33000, 3320]] as [number, number][] },
  pedidosya: { comision: 0.3 },
  rappi: { comision: 0.32 },
};

function fijoMl(precio: number): number {
  for (const [hasta, fijo] of REGLAS.ml.fijos) if (precio < hasta) return fijo;
  return 0;
}

/** Redondeo hacia arriba, como los precios de Acopio: de a $100 hasta $20.000 y de a $500 arriba. */
export function redondoArriba(n: number): number {
  const paso = n < 20000 ? 100 : 500;
  return Math.ceil(n / paso) * paso;
}

/** Cuánto le queda a Acopio de un precio publicado en el canal (después de comisión, cargos, IVA de la comisión, IIBB y envío). */
export function netoCanal(precio: number, canal: Canal): number {
  const { iva, iibb } = REGLAS;
  if (canal === "pedidosya" || canal === "rappi") return precio * (1 - REGLAS[canal].comision * (1 + iva) - iibb);
  const com = canal === "mercadolibre-premium" ? REGLAS.ml.premium : REGLAS.ml.clasica;
  const envio = precio >= REGLAS.ml.umbralEnvioGratis ? REGLAS.ml.envioVendedor : 0;
  return precio * (1 - com * (1 + iva) - iibb) - fijoMl(precio) * (1 + iva) - envio;
}

/** El precio a publicar en el canal para cobrar al menos lo mismo que en la web. */
export function precioCanal(precioWeb: number, canal: Canal): number {
  // Se busca el precio redondo más chico cuyo neto alcanza el precio web (los cargos fijos son por tramos).
  const { iva, iibb } = REGLAS;
  const com = canal === "pedidosya" || canal === "rappi" ? REGLAS[canal].comision : canal === "mercadolibre-premium" ? REGLAS.ml.premium : REGLAS.ml.clasica;
  let p = redondoArriba(precioWeb / (1 - com * (1 + iva) - iibb));
  for (let i = 0; i < 400 && netoCanal(p, canal) < precioWeb; i++) p = redondoArriba(p + 1);
  return p;
}
