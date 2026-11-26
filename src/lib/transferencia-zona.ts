// 26/11 (María Ilda, AS-00180, Colinas, al recibir): dijo algo de transferir y el bot le contestó «Son $27.000 por
// transferencia» con el CVU y «si llega antes de las 15, sale hoy». Ella: «No voy a mandar la transferencia antes de
// recibir el pedido». Política de Santiago (19-23/11): en Carlos Paz, la zona y el viaje a Córdoba (Capital y
// Malagueño) se paga al recibir y no se le pide a nadie que pague antes («la gente piensa que es estafa»).
// Regla: en esas zonas «te pago con transferencia» es pagar por transferencia CUANDO LLEGA → sin datos ni apuro.
// Solo si pide el alias o los datos de forma explícita se los pasamos, sin «antes de las 15». Puro: se prueba sin base.

export type ZonaTipo = "propia" | "capital" | "correo" | null | undefined;

export type RespuestaTransferencia = "datos" | "al_recibir" | "datos_sin_apuro";

/** Paga al recibir esa zona: reparto propio y el viaje a Córdoba. Correo y desconocido, pago antes. */
export function pagaAlRecibirLaZona(tipo: ZonaTipo): boolean {
  return tipo === "propia" || tipo === "capital";
}

/** Qué hacer cuando, con el pedido hecho, el cliente habla de transferir. */
export function respuestaTransferencia(c: { zona: ZonaTipo; pidioDatos: boolean }): RespuestaTransferencia {
  if (!pagaAlRecibirLaZona(c.zona)) return "datos";
  return c.pidioDatos ? "datos_sin_apuro" : "al_recibir";
}

/** «Te transfiero» en la zona: se paga por transferencia cuando llega, sin alias ahora. */
export function textoTransferirAlRecibir(c: { quien: string; monto: string; pedido: string }): string {
  return `Dale${c.quien}, lo pagás por transferencia cuando te lo llevamos: ${c.monto} (pedido ${c.pedido}). En el momento te pasamos el alias, no hace falta que transfieras antes 🙌`;
}

/** Pidió el alias en la zona: van los datos, sin «si llega antes de las 15» ni pedir el comprobante ya. */
export function textoDatosSinApuro(c: { quien: string; monto: string; pedido: string; datos: string }): string {
  return `¡Dale${c.quien}! Son ${c.monto} (pedido ${c.pedido}).\n\n${c.datos}\n\nPodés transferir ahora o cuando te lo llevamos, como te quede más cómodo 🙌`;
}
