// «Sin stock a mano»: un producto que pausamos nosotros porque no lo tenemos en casa
// (POST /api/admin/catalogo/stock o el selector «Estado» del panel), aunque el proveedor lo siga listando.
//
// Por qué existe: la lectura diaria de precios de La Granja vuelve a ACTIVO todo SIN_STOCK que aparece
// en su lista («REAPARECIDO»). Eso sirve cuando la baja la puso la misma lectura, pero el 11/11 volvió a
// poner en venta la almendra que Santiago había pausado el 10/11 (no hay almendra en casa: se compra en Harinar).
// La marca vive en `ocultoMotivo` (en un producto visible no se usa para otra cosa) y no necesita migración.

export const MOTIVO_SIN_STOCK_A_MANO = "Sin stock en casa (pausado a mano)";

type ConEstado = { estado: string; ocultoMotivo?: string | null };

/** ¿Lo pausamos nosotros? Entonces solo vuelve a la venta a mano, nunca con la lectura del proveedor. */
export function esSinStockAMano(p: ConEstado): boolean {
  return p.estado === "SIN_STOCK" && p.ocultoMotivo === MOTIVO_SIN_STOCK_A_MANO;
}

/**
 * `ocultoMotivo` que corresponde al guardar un producto visible desde el panel.
 * Pasar a SIN_STOCK a mano deja la marca; si ya la tenía y sigue SIN_STOCK, la conserva;
 * cualquier otro estado la borra. Un SIN_STOCK que puso la lectura del proveedor no se marca solo por guardarlo.
 */
export function motivoAlGuardarVisible(previo: ConEstado, estadoNuevo: string): string | null {
  if (estadoNuevo !== "SIN_STOCK") return null;
  if (previo.estado !== "SIN_STOCK" || esSinStockAMano(previo)) return MOTIVO_SIN_STOCK_A_MANO;
  return null;
}
