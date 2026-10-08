export type Bulto = { pesoG: number; unidades: number; excedido: boolean };

export type Modalidad = "propia" | "sucursal" | "domicilio";
export type OrigenEnvio = "propia" | "tabla" | "micorreo" | "andreani";

/** Lo que devuelve un proveedor: costo real para nosotros, sin reglas comerciales. */
export type Tarifa = { id: string; proveedor: OrigenEnvio; modalidad: Modalidad; nombre: string; costo: number; plazo: string };

/** Lo que ve el cliente: `precio` ya tiene aplicado el envío gratis si corresponde. */
export type OpcionEnvio = Tarifa & { precio: number; masBarata: boolean };

export type PedidoCotizacion = { cpOrigen: string; cpDestino: string; provincia: string; bultos: Bulto[]; valorDeclarado: number };

export interface ShippingProvider {
  id: OrigenEnvio;
  /** true si están las credenciales en variables de entorno. */
  configurado(): boolean;
  cotizar(pedido: PedidoCotizacion): Promise<Tarifa[]>;
}
