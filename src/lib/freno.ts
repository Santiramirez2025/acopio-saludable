// Freno por origen para rutas públicas que escriben (medición, formularios): tantos pedidos por IP
// en una ventana de tiempo. Vive en memoria de la instancia, así no le suma consultas a la base por
// cada visita: es un tope por instancia de Vercel, no un contador global. Alcanza para que nadie
// llene una tabla desde una sola máquina sin esfuerzo; contra un ataque distribuido grande hace falta
// un WAF, no esto.

import { timingSafeEqual } from "node:crypto";

type Ventana = { n: number; hasta: number };
const ventanas = new Map<string, Ventana>();
const MAX_CLAVES = 5000;

/** true si este origen todavía tiene cupo en la ventana (cuenta el intento); false si hay que frenarlo. */
export function admiteFreno(clave: string, max: number, ventanaMs: number, ahora = Date.now()): boolean {
  let v = ventanas.get(clave);
  if (!v || v.hasta <= ahora) {
    if (ventanas.size >= MAX_CLAVES) limpiar(ahora);
    v = { n: 0, hasta: ahora + ventanaMs };
    ventanas.set(clave, v);
  }
  v.n += 1;
  return v.n <= max;
}

function limpiar(ahora: number) {
  for (const [k, v] of ventanas) if (v.hasta <= ahora) ventanas.delete(k);
  // Si siguen todas vivas (ataque con muchas IPs), se vacía: mejor dejar pasar un rato que crecer sin tope.
  if (ventanas.size >= MAX_CLAVES) ventanas.clear();
}

/** IP del visitante según Vercel (x-forwarded-for la pone el proxy, el cliente no la elige). */
export function ipDe(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  const ip = (xff?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim();
  return ip || "desconocida";
}

/**
 * Tope global de la medición: cuántos eventos por minuto acepta la tienda entera, contados en la base
 * (que sí es compartida entre instancias). Hoy el sitio registra decenas de eventos por DÍA; 300 por
 * minuto deja margen a un pico real (una publicación viral) y acota cuánto puede crecer la tabla si
 * alguien la quiere llenar desde muchas IPs.
 */
export const MEDICION_MAX_MINUTO = 300;
export function admiteMedicion(eventosUltimoMinuto: number): boolean {
  return eventosUltimoMinuto < MEDICION_MAX_MINUTO;
}

/**
 * Rutas públicas que disparan algo caro o hacia afuera, por IP y por instancia:
 * - POST /api/pedidos crea un pedido y manda un mail al email que escriba quien lo envía (Resend, con
 *   nuestro dominio) más el aviso de venta a Santiago. Sin tope, un script usa la tienda para mandar mails
 *   a terceros y llena la base de pedidos falsos. Hoy entra cerca de un pedido web por día: 6 intentos en
 *   10 minutos desde una IP alcanzan para quien se equivoca y reintenta.
 * - POST /api/asistente llama a la IA (se paga por mensaje). Pasado el tope no se corta la charla: contesta
 *   el asistente de reglas, que no gasta. 30 mensajes en 10 minutos es más de lo que escribe una persona.
 */
export const PEDIDOS_MAX_POR_IP = 6;
export const ASISTENTE_IA_MAX_POR_IP = 30;
export const VENTANA_PUBLICA_MS = 10 * 60_000;

/**
 * Freno del login con contraseña, sobre los fallos de los últimos 15 minutos (contados en la base).
 * Por IP corta a quien prueba desde una máquina sin afectar a Santiago; el tope global acota un ataque
 * desde muchas IPs. Hace falta más de una IP para llegar al aviso, así un error de tipeo propio no avisa.
 */
export const LOGIN_MAX_POR_IP = 5;
export const LOGIN_AVISO_TOTAL = 10;
export const LOGIN_MAX_TOTAL = 30;
export function decidirLogin(fallos: { total: number; ip: number }): { admite: boolean; avisar: boolean } {
  return {
    admite: fallos.ip < LOGIN_MAX_POR_IP && fallos.total < LOGIN_MAX_TOTAL,
    avisar: fallos.total + 1 === LOGIN_AVISO_TOTAL, // este fallo es el que llega al umbral: avisa una sola vez
  };
}

/** Compara una firma o clave que llega de afuera con la esperada sin que el tiempo de respuesta delate cuántos caracteres acertó. */
export function igualesSeguro(recibida: string, esperada: string): boolean {
  const a = Buffer.from(String(recibida));
  const b = Buffer.from(String(esperada));
  return a.length === b.length && b.length > 0 && timingSafeEqual(a, b);
}

/** Solo para tests. */
export function _reiniciarFreno() {
  ventanas.clear();
}
