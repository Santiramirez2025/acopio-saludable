// A dónde lleva el número de seguimiento que cargamos en el pedido.

import type { CorreoId } from "./tabla";

/**
 * El cliente tiene que poder tocar el número y ver dónde está su paquete, no copiarlo a mano.
 * Devuelve null cuando no sabemos de qué correo es: mejor mostrar el número suelto que un link roto.
 */
export function linkSeguimiento(correo: CorreoId | string | null | undefined, tracking: string | null | undefined): string | null {
  // Andreani pide el número sin guiones ni puntos.
  const numero = (tracking ?? "").replace(/[\s.-]/g, "");
  if (!numero || !/^[A-Za-z0-9]{6,40}$/.test(numero)) return null;
  if (correo === "andreani") return `https://www.andreani.com/#!/informacionEnvio/${encodeURIComponent(numero)}`;
  return null;
}
