// Candado para los crons que le escriben a clientes (Rodri, 22/11). Sin CRON_SECRET, el encabezado de Vercel se puede
// falsificar (ver cron-acceso.ts): diez llamadas a la vez a /api/cron/grafica-dia leían la misma lista de candidatos
// antes de que ninguna guardara su envío, y cada cliente recibía diez mensajes (y Meta baja la calidad del número).
// Con el candado, cada tarea corre como mucho una vez por ventana: la primera llamada lo toma y las demás no mandan nada.
// Es atómico: el chequeo y la toma van en una transacción con un lock de Postgres, así que dos llamadas simultáneas
// no pueden tomarlo las dos. No reemplaza a CRON_SECRET: limita el daño hasta que esté cargado (y después también).

export const VENTANA_CANDADO_MIN = 30;

/** Toma el candado de la tarea en la base. true = esta llamada lo tomó y puede correr. */
export async function tomarCandado(nombre: string, minutos = VENTANA_CANDADO_MIN): Promise<boolean> {
  const { prisma } = await import("./prisma");
  const clave = `candado-${nombre}`;
  const [, filas] = await prisma.$transaction([
    prisma.$queryRaw`SELECT 1 AS ok FROM pg_advisory_xact_lock(hashtext(${clave}::text))`,
    prisma.$queryRaw<{ ok: number }[]>`
      INSERT INTO "CronCorrida" ("nombre", "ok", "detalle")
      SELECT ${clave}, true, 'tomado'
      WHERE NOT EXISTS (
        SELECT 1 FROM "CronCorrida" WHERE "nombre" = ${clave} AND "fecha" > now() - make_interval(mins => ${minutos}::int)
      )
      RETURNING 1 AS ok`,
  ]);
  return filas.length > 0;
}

/**
 * Corre la tarea solo si toma el candado; si no, devuelve un aviso sin mandar nada.
 * `tomar` se puede reemplazar en los tests (no hay base).
 */
export async function conCandado<T>(
  nombre: string,
  tarea: () => Promise<T>,
  tomar: (nombre: string) => Promise<boolean> = tomarCandado,
): Promise<T | { omitido: string }> {
  if (!(await tomar(nombre))) {
    return { omitido: `«${nombre}» ya corrió en los últimos ${VENTANA_CANDADO_MIN} minutos: no se manda de nuevo.` };
  }
  return tarea();
}
