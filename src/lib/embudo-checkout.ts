// Embudo del checkout por paso (orden de Laura 14/11: «medí dónde se cae el checkout»).
// Checkout.tsx registra un evento por paso en el registro propio (/api/medicion) y
// /api/admin/analisis?parte=trafico los cuenta por sesión con esta función.
// Solo mide: no toca el cálculo del pedido, el envío ni el cobro.

/** Eventos de paso del checkout, en el orden en que los recorre el cliente. */
export const PASOS_CHECKOUT = [
  "checkout_datos", // completó nombre, email y WhatsApp
  "checkout_envio", // vio las opciones de envío y puede pagar
  "checkout_confirmar", // tocó «Confirmar» con todo válido
  "checkout_pedido", // el pedido quedó creado (va a Mercado Pago o a los datos de transferencia)
] as const;

/** Desvíos: el cliente se trabó en algo que no es un paso. */
export const TRABAS_CHECKOUT = [
  "checkout_bajo_minimo", // el CP pide compra mínima y no llega (otras localidades: $60.000)
  "checkout_error_envio", // no se pudo calcular el envío
  "checkout_error_pedido", // el servidor rechazó el pedido al confirmar
  "checkout_a_mp", // el pedido salió hacia Mercado Pago
  "checkout_transferencia", // el pedido salió por transferencia
] as const;

export const EVENTOS_CHECKOUT: readonly string[] = [...PASOS_CHECKOUT, ...TRABAS_CHECKOUT];

const NOMBRE: Record<(typeof PASOS_CHECKOUT)[number], string> = {
  checkout_datos: "datos",
  checkout_envio: "envío",
  checkout_confirmar: "confirmar",
  checkout_pedido: "pedido creado",
};

export type EmbudoCheckout = {
  entraron: number;
  completaronDatos: number;
  vieronEnvio: number;
  tocaronConfirmar: number;
  pedidoCreado: number;
  fueronAMercadoPago: number;
  eligieronTransferencia: number;
  bajoMinimo: number;
  errorEnvio: number;
  errorAlConfirmar: number;
  /** Cuántas sesiones se fueron en cada paso (entraron al paso y no pasaron al siguiente). */
  seVanEn: { paso: string; sesiones: number }[];
};

/**
 * Cuenta por sesión: una sesión entra al checkout con «iniciar_compra». Cada paso cuenta si la sesión
 * llegó a ese paso o a uno posterior (si el evento de un paso se pierde, no se infla el abandono).
 */
export function embudoCheckout(sesiones: Iterable<Set<string>>): EmbudoCheckout {
  const dentro = [...sesiones].filter((s) => s.has("iniciar_compra"));
  // Paso más avanzado alcanzado por cada sesión: -1 = entró y no completó los datos.
  const alcanzado = dentro.map((s) => {
    let max = -1;
    PASOS_CHECKOUT.forEach((p, i) => { if (s.has(p)) max = i; });
    return max;
  });
  const llegaron = (i: number) => alcanzado.filter((a) => a >= i).length;
  const cuenta = (e: string) => dentro.filter((s) => s.has(e)).length;
  const etapas = ["entrar", ...PASOS_CHECKOUT.map((p) => NOMBRE[p])];
  const seVanEn = etapas.slice(0, -1).map((paso, i) => ({ paso, sesiones: alcanzado.filter((a) => a === i - 1).length }));
  return {
    entraron: dentro.length,
    completaronDatos: llegaron(0),
    vieronEnvio: llegaron(1),
    tocaronConfirmar: llegaron(2),
    pedidoCreado: llegaron(3),
    fueronAMercadoPago: cuenta("checkout_a_mp"),
    eligieronTransferencia: cuenta("checkout_transferencia"),
    bajoMinimo: cuenta("checkout_bajo_minimo"),
    errorEnvio: cuenta("checkout_error_envio"),
    errorAlConfirmar: cuenta("checkout_error_pedido"),
    seVanEn: seVanEn.map((x) => ({ paso: x.paso === "entrar" ? "datos (entró y no completó)" : `después de ${x.paso}`, sesiones: x.sesiones })),
  };
}

/** Los datos están completos cuando hay nombre (3+ letras), un email con @ y un WhatsApp de 8+ dígitos. */
export function datosCompletos(nombre: string, email: string, telefono: string): boolean {
  return nombre.trim().length >= 3 && /.+@.+\..+/.test(email.trim()) && telefono.replace(/\D/g, "").length >= 8;
}
