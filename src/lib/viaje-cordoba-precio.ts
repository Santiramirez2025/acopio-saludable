// Sin dependencias (se testea sin Prisma).

/** Lo que dice la plantilla aprobada por Meta (texto fijo). Si el envío vigente es otro, la plantilla no sale. */
export const ENVIO_PLANTILLA_VIAJE = 5000;

/**
 * 16/11 14:30 (Santiago): el envío a Córdoba Capital y Malagueño pasó a $9.000. La plantilla v1 dice «$5.000» y su
 * texto no se puede cambiar sin aprobar otra en Meta: mandarla ahora le promete a un cliente un envío que ya no vale.
 * Se bloquea cuando el precio de la zona paga (panel → Envíos) no coincide con el de la plantilla.
 */
export function plantillaViajeVigente(precioZonaPaga: number | null | undefined): boolean {
  return precioZonaPaga === ENVIO_PLANTILLA_VIAJE;
}
