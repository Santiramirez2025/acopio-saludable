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

export type EstadoConversacion = "bot" | "persona";

export type Conversacion = {
  telefono: string;
  nombre: string | null;
  estado: EstadoConversacion;
  noLeidos: number;
  ultimoMensaje: Date;
  creado: Date;
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

/** Los últimos turnos de la charla, en el formato que entiende el vendedor. */
export async function historialDe(telefono: string, cantidad = 8): Promise<Turno[]> {
  const filas = await prisma.$queryRaw<{ de: string; texto: string }[]>`
    SELECT "de", "texto" FROM "WhatsappMensaje"
    WHERE "telefono" = ${telefono}
    ORDER BY "fecha" DESC
    LIMIT ${cantidad}
  `;
  return filas.reverse().map((f) => ({ de: f.de === "cliente" ? ("yo" as const) : ("acopio" as const), texto: f.texto }));
}

export async function estadoDe(telefono: string): Promise<EstadoConversacion> {
  const filas = await prisma.$queryRaw<{ estado: string }[]>`SELECT "estado" FROM "WhatsappConversacion" WHERE "telefono" = ${telefono}`;
  return filas[0]?.estado === "persona" ? "persona" : "bot";
}

export async function cambiarEstado(telefono: string, estado: EstadoConversacion): Promise<void> {
  await prisma.$executeRaw`UPDATE "WhatsappConversacion" SET "estado" = ${estado} WHERE "telefono" = ${telefono}`;
}

export async function marcarLeida(telefono: string): Promise<void> {
  await prisma.$executeRaw`UPDATE "WhatsappConversacion" SET "noLeidos" = 0 WHERE "telefono" = ${telefono}`;
}

export async function listarConversaciones(limite = 100): Promise<(Conversacion & { ultimoTexto: string | null })[]> {
  return prisma.$queryRaw<(Conversacion & { ultimoTexto: string | null })[]>`
    SELECT c."telefono", c."nombre", c."estado", c."noLeidos", c."ultimoMensaje", c."creado",
           (SELECT m."texto" FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" ORDER BY m."fecha" DESC LIMIT 1) AS "ultimoTexto"
    FROM "WhatsappConversacion" c
    ORDER BY (c."estado" = 'persona') DESC, c."ultimoMensaje" DESC
    LIMIT ${limite}
  `;
}

export async function conversacionDe(telefono: string): Promise<Conversacion | null> {
  const filas = await prisma.$queryRaw<Conversacion[]>`SELECT * FROM "WhatsappConversacion" WHERE "telefono" = ${telefono}`;
  return filas[0] ?? null;
}

export async function mensajesDe(telefono: string, limite = 200): Promise<Mensaje[]> {
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
