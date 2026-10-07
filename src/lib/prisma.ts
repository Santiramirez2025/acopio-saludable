import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export function crearPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Falta la variable de entorno DATABASE_URL");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? crearPrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
