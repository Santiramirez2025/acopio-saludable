// Faltantes del día que el bot no debe ofrecer aunque el producto siga activo en la tienda (los pedidos ya
// tomados se siguen entregando con lo reservado). 27/11: sin dátiles; el bot decía «se terminaron los dátiles»
// y en la misma charla mandaba la lista de precios con «Dátiles $14.000» (María Inés, Viky, Debora).
// Vaciar cuando vuelvan.
export const SIN_STOCK_HOY: { etiqueta: string }[] = [{ etiqueta: "Dátiles" }];

export const faltaHoy = (etiqueta: string) => SIN_STOCK_HOY.some((s) => s.etiqueta === etiqueta);
