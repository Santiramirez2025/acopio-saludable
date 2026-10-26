// Memoria de las conversaciones de WhatsApp.
//
// Le habla a las tablas por SQL directo y no por el cliente de Prisma, a propósito: así el
// código compila aunque el cliente generado sea anterior a estas tablas. Los modelos están
// en schema.prisma para que la base y el esquema digan lo mismo.
//
// Tres cosas salen de acá y antes no existían:
// - el dedupe de webhooks es durable (el wamid es clave primaria),
// - el hilo de la charla sobrevive a que Vercel recicle la instancia,
// - una persona puede tomar la charla desde el panel y el bot se calla.

import { prisma } from "./prisma";
import type { Turno } from "./vendedor";
import { sinIds } from "./whatsapp-media";
import { telefonoFin } from "./telefono";

export type EstadoConversacion = "bot" | "persona";

export type Conversacion = {
  telefono: string;
  nombre: string | null;
  estado: EstadoConversacion;
  noLeidos: number;
  ultimoMensaje: Date;
  creado: Date;
  anuncioId: string | null;
  anuncioTitulo: string | null;
  prospecto: string | null;
  baja: boolean;
};

export type Mensaje = { id: string; telefono: string; de: "cliente" | "bot" | "persona"; texto: string; fecha: Date };

/**
 * Registra un mensaje entrante. Devuelve false si ya estaba: Meta reentrega webhooks
 * y una reentrega no tiene que contestarse dos veces.
 */
export async function registrarEntrante(id: string, telefono: string, nombre: string | null, texto: string): Promise<boolean> {
  await prisma.$executeRaw`
    INSERT INTO "WhatsappConversacion" ("telefono", "nombre")
    VALUES (${telefono}, ${nombre})
    ON CONFLICT ("telefono") DO UPDATE
      SET "nombre" = COALESCE(EXCLUDED."nombre", "WhatsappConversacion"."nombre")
  `;
  const filas = await prisma.$executeRaw`
    INSERT INTO "WhatsappMensaje" ("id", "telefono", "de", "texto")
    VALUES (${id}, ${telefono}, 'cliente', ${texto})
    ON CONFLICT ("id") DO NOTHING
  `;
  if (filas === 0) return false;
  await prisma.$executeRaw`
    UPDATE "WhatsappConversacion"
    SET "ultimoMensaje" = now(), "noLeidos" = "noLeidos" + 1
    WHERE "telefono" = ${telefono}
  `;
  return true;
}

export type Referido = { anuncioId: string | null; titulo: string | null; ctwaClid: string | null };

/**
 * El anuncio "clic a WhatsApp" que trajo este mensaje. Se pisa el último (para atribuir la
 * venta al anuncio que la reactivó) y se conserva el primero (de dónde vino la persona).
 */
export async function registrarAnuncio(telefono: string, r: Referido): Promise<void> {
  if (!r.anuncioId && !r.ctwaClid) return;
  await prisma.$executeRaw`
    UPDATE "WhatsappConversacion"
    SET "anuncioId" = ${r.anuncioId},
        "anuncioTitulo" = ${r.titulo},
        "ctwaClid" = COALESCE(${r.ctwaClid}, "ctwaClid"),
        "primerAnuncioId" = COALESCE("primerAnuncioId", ${r.anuncioId}),
        "anuncioFecha" = now()
    WHERE "telefono" = ${telefono}
  `;
}

/** Lo que contestó el bot o una persona. El id se inventa: Meta no lo manda en el envío. */
export async function registrarSalida(telefono: string, de: "bot" | "persona", texto: string): Promise<void> {
  const id = `out.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
  await prisma.$executeRaw`
    INSERT INTO "WhatsappMensaje" ("id", "telefono", "de", "texto")
    VALUES (${id}, ${telefono}, ${de}, ${texto})
  `;
  // Si contestó una persona, ya leyó lo que había.
  if (de === "persona") {
    await prisma.$executeRaw`UPDATE "WhatsappConversacion" SET "noLeidos" = 0, "ultimoMensaje" = now() WHERE "telefono" = ${telefono}`;
  } else {
    await prisma.$executeRaw`UPDATE "WhatsappConversacion" SET "ultimoMensaje" = now() WHERE "telefono" = ${telefono}`;
  }
}

/** El id del último mensaje que escribió el cliente: sirve para contestar una sola vez a una ráfaga. */
export async function ultimoDelCliente(telefono: string): Promise<string | null> {
  const filas = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "WhatsappMensaje"
    WHERE "telefono" = ${telefono} AND "de" = 'cliente'
      AND "texto" NOT LIKE '[reacción%' AND "texto" NOT LIKE '[sacó la reacción]' AND "texto" NOT LIKE '[sticker%'
    ORDER BY "fecha" DESC
    LIMIT 1
  `;
  return filas[0]?.id ?? null;
}

/**
 * ¿Escribió en las últimas 24 horas? Fuera de esa ventana Meta acepta el texto libre (responde 200)
 * pero no lo entrega: hay que mandar plantilla. Sin esto los avisos y comprobantes se perdían callados.
 */
export async function ventanaAbierta(telefono: string): Promise<boolean> {
  const d = telefonoFin(telefono);
  const filas = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM "WhatsappMensaje"
    WHERE right(regexp_replace("telefono", '[^0-9]', '', 'g'), 10) = ${d} AND "de" = 'cliente' AND "fecha" > now() - interval '23 hours'
  `;
  return Number(filas[0]?.n ?? 0) > 0;
}

/** Cuántos mensajes mandó el vendedor a esta charla en los últimos minutos (freno de bucles). */
export async function respuestasRecientes(telefono: string, minutos = 10): Promise<number> {
  const f = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM "WhatsappMensaje"
    WHERE "telefono" = ${telefono} AND "de" = 'bot' AND "fecha" > now() - (${minutos} * interval '1 minute')
  `;
  return Number(f[0]?.n ?? 0);
}

/** El pedido armado en la charla (camino del carrito), o null. */
export async function pedidoGuardado(telefono: string): Promise<string | null> {
  const f = await prisma.$queryRaw<{ pedido: string | null }[]>`SELECT "pedido" FROM "WhatsappConversacion" WHERE "telefono" = ${telefono}`;
  return f[0]?.pedido ?? null;
}

export async function guardarPedido(telefono: string, camino: string | null): Promise<void> {
  await prisma.$executeRaw`UPDATE "WhatsappConversacion" SET "pedido" = ${camino} WHERE "telefono" = ${telefono}`;
}

/** Los últimos turnos de la charla, en el formato que entiende el vendedor. */
export async function historialDe(telefono: string, cantidad = 8): Promise<Turno[]> {
  const filas = await prisma.$queryRaw<{ de: string; texto: string }[]>`
    SELECT "de", "texto" FROM "WhatsappMensaje"
    WHERE "telefono" = ${telefono}
    ORDER BY "fecha" DESC
    LIMIT ${cantidad}
  `;
  return filas.reverse().map((f) => ({ de: f.de === "cliente" ? ("yo" as const) : ("acopio" as const), texto: sinIds(f.texto) }));
}

/** Si una persona tomó la charla y no escribe en este tiempo, el vendedor la retoma solo. */
export const RETOMA_HORAS = 2;

/**
 * Quién atiende ahora. Una charla en manos de una persona vuelve sola al vendedor si nadie
 * del equipo escribió en las últimas RETOMA_HORAS: tomar la charla y olvidarse de devolverla
 * deja al cliente hablando solo, que es peor que un bot.
 *
 * La referencia es el último mensaje que no es del cliente: o la respuesta de la persona, o
 * el aviso del bot "te contesta una persona", si nadie llegó a contestar.
 */
export async function estadoDe(telefono: string): Promise<EstadoConversacion> {
  const filas = await prisma.$queryRaw<{ estado: string; ultimo: Date | null }[]>`
    SELECT c."estado",
           (SELECT MAX(m."fecha") FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" AND m."de" <> 'cliente') AS "ultimo"
    FROM "WhatsappConversacion" c WHERE c."telefono" = ${telefono}
  `;
  const f = filas[0];
  if (f?.estado !== "persona") return "bot";
  if (f.ultimo && Date.now() - new Date(f.ultimo).getTime() > RETOMA_HORAS * 3_600_000) {
    await cambiarEstado(telefono, "bot");
    return "bot";
  }
  return "persona";
}

export async function cambiarEstado(telefono: string, estado: EstadoConversacion): Promise<void> {
  await prisma.$executeRaw`UPDATE "WhatsappConversacion" SET "estado" = ${estado} WHERE "telefono" = ${telefono}`;
}

export async function marcarLeida(telefono: string): Promise<void> {
  await prisma.$executeRaw`UPDATE "WhatsappConversacion" SET "noLeidos" = 0 WHERE "telefono" = ${telefono}`;
}

export type Resumen = Conversacion & { ultimoTexto: string | null; ultimoDe: Mensaje["de"] | null; pedido: string | null; compras: number; aCobrar: number };

export async function listarConversaciones(limite = 100): Promise<Resumen[]> {
  return prisma.$queryRaw<Resumen[]>`
    SELECT c."telefono", c."nombre", c."estado", c."noLeidos", c."ultimoMensaje", c."creado", c."anuncioId", c."anuncioTitulo", c."prospecto", c."baja",
           c."pedido", u."texto" AS "ultimoTexto", u."de" AS "ultimoDe",
           COALESCE(o."compras", 0)::int AS "compras", COALESCE(o."aCobrar", 0)::int AS "aCobrar"
    FROM "WhatsappConversacion" c
    LEFT JOIN LATERAL (
      -- Solo el comienzo: en la lista se ve una línea y la base se cobra por lo que transfiere.
      SELECT left(m."texto", 160) AS "texto", m."de" FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" ORDER BY m."fecha" DESC LIMIT 1
    ) u ON true
    LEFT JOIN LATERAL (
      -- Mismo cliente aunque el teléfono del pedido esté escrito distinto: se comparan los últimos 10 dígitos.
      SELECT COUNT(*) AS "compras",
             COUNT(*) FILTER (WHERE x."estado"::text IN ('PENDIENTE_PAGO','PAGADO','EN_COMPRA','PREPARADO','ENVIADO')) AS "aCobrar"
      FROM "Order" x
      WHERE x."estado"::text <> 'CANCELADO' AND length(c."telefono") >= 10
        AND right(regexp_replace(x."telefono", '[^0-9]', '', 'g'), 10) = right(c."telefono", 10)
    ) o ON true
    ORDER BY (c."estado" = 'persona' AND c."noLeidos" > 0) DESC, c."ultimoMensaje" DESC
    LIMIT ${limite}
  `;
}

export async function conversacionDe(telefono: string): Promise<Conversacion | null> {
  const filas = await prisma.$queryRaw<Conversacion[]>`
    SELECT "telefono", "nombre", "estado", "noLeidos", "ultimoMensaje", "creado", "anuncioId", "anuncioTitulo", "prospecto", "baja"
    FROM "WhatsappConversacion" WHERE "telefono" = ${telefono}
  `;
  return filas[0] ?? null;
}

export async function mensajesDe(telefono: string, limite = 80): Promise<Mensaje[]> {
  const filas = await prisma.$queryRaw<Mensaje[]>`
    SELECT "id", "telefono", "de", "texto", "fecha" FROM "WhatsappMensaje"
    WHERE "telefono" = ${telefono}
    ORDER BY "fecha" DESC
    LIMIT ${limite}
  `;
  return filas.reverse();
}

/** Cuántas charlas esperan una persona: para el badge del panel. */
export async function esperandoPersona(): Promise<number> {
  const filas = await prisma.$queryRaw<{ n: bigint | number }[]>`SELECT COUNT(*) AS n FROM "WhatsappConversacion" WHERE "estado" = 'persona' AND "noLeidos" > 0`;
  return Number(filas[0]?.n ?? 0);
}
