import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Conexión a la base. Acepta DATABASE_URL o, si no está, las variables que cargan solas
 * las integraciones de Vercel (Supabase, Neon, Postgres): POSTGRES_PRISMA_URL / POSTGRES_URL.
 */
export function urlBase(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("Falta la conexión a la base: definí DATABASE_URL (o conectá una base desde Vercel)");
  // "sslmode=require" pide conexión cifrada sin validar la cadena de certificados (así lo entiende Postgres).
  // El driver de Node lo interpreta más estricto y falla con el certificado de Supabase; este parámetro le da el significado estándar.
  if (/[?&]sslmode=require\b/.test(url) && !/uselibpqcompat=/.test(url)) return `${url}&uselibpqcompat=true`;
  return url;
}

export function crearPrisma(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: urlBase() }) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? crearPrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
