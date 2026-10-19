// Acceso al panel aprobado por WhatsApp. El navegador que pide entrar guarda un código secreto;
// a Santiago le llega por WhatsApp un link distinto para aprobar. Sin su toque, no entra nadie.

import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { avisarSantiago } from "./avisos";
import { urlSitio } from "./sitio";

const VENCE_MIN = 15;
const azar = () => randomBytes(24).toString("base64url");

export async function pedirAcceso(detalle: string): Promise<string | null> {
  const [{ n }] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "AccesoPendiente" WHERE "fecha" > now() - interval '15 minutes'`;
  if (Number(n) >= 5) return null; // nadie llena el WhatsApp de pedidos
  const codigo = azar();
  const aprobar = azar();
  await prisma.$executeRaw`INSERT INTO "AccesoPendiente" ("codigo", "aprobar", "detalle") VALUES (${codigo}, ${aprobar}, ${detalle.slice(0, 300)})`;
  await avisarSantiago(
    "Pedido de acceso al panel",
    `🔐 Piden entrar al panel de Acopio desde: ${detalle.slice(0, 120)}.\nSi fuiste vos (o le pediste a Claude), aprobalo acá: ${urlSitio()}/admin/login/aprobar?t=${aprobar}\nSi no, ignoralo: vence en ${VENCE_MIN} minutos.`,
  );
  return codigo;
}

export async function verAprobacion(aprobar: string) {
  const r = await prisma.$queryRaw<{ detalle: string | null; aprobado: boolean; vencido: boolean }[]>`
    SELECT "detalle", "aprobado", "fecha" < now() - interval '15 minutes' AS vencido FROM "AccesoPendiente" WHERE "aprobar" = ${aprobar}`;
  return r[0] ?? null;
}

export async function aprobarAcceso(aprobar: string): Promise<boolean> {
  const n = await prisma.$executeRaw`UPDATE "AccesoPendiente" SET "aprobado" = true WHERE "aprobar" = ${aprobar} AND NOT "usado" AND "fecha" > now() - interval '15 minutes'`;
  return n > 0;
}

export async function estadoAcceso(codigo: string): Promise<"esperando" | "aprobado" | "vencido"> {
  const r = await prisma.$queryRaw<{ aprobado: boolean; usado: boolean; vencido: boolean }[]>`
    SELECT "aprobado", "usado", "fecha" < now() - interval '15 minutes' AS vencido FROM "AccesoPendiente" WHERE "codigo" = ${codigo}`;
  const a = r[0];
  if (!a || a.usado || a.vencido) return "vencido";
  return a.aprobado ? "aprobado" : "esperando";
}

/** Se usa una sola vez: el inicio de sesión lo gasta. */
export async function gastarAcceso(codigo: string): Promise<boolean> {
  const n = await prisma.$executeRaw`UPDATE "AccesoPendiente" SET "usado" = true WHERE "codigo" = ${codigo} AND "aprobado" AND NOT "usado" AND "fecha" > now() - interval '15 minutes'`;
  return n > 0;
}
