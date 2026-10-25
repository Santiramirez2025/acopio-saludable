// Quién puede usar las APIs del panel: Santiago con su sesión, o un agente de la empresa con la
// clave de agentes (cabecera «x-agente-clave»). La clave se guarda solo como hash (sha256): en la
// variable AGENTES_CLAVE_SHA256 de Vercel o, si no está, en la última fila «clave-agentes» de la base.
// Así los agentes que corren en la nube pueden trabajar aunque no tengan el Chrome de Santiago.
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export function hashClave(clave: string): string {
  return createHash("sha256").update(clave.trim()).digest("hex");
}

let cache: { hash: string | null; hasta: number } | null = null;

async function hashGuardado(): Promise<string | null> {
  if (process.env.AGENTES_CLAVE_SHA256) return process.env.AGENTES_CLAVE_SHA256.trim().toLowerCase();
  if (cache && cache.hasta > Date.now()) return cache.hash;
  const r = await prisma.$queryRaw<{ detalle: string | null }[]>`SELECT "detalle" FROM "CronCorrida" WHERE "nombre" = 'clave-agentes' ORDER BY "fecha" DESC LIMIT 1`.catch(() => []);
  cache = { hash: r[0]?.detalle ?? null, hasta: Date.now() + 60_000 };
  return cache.hash;
}

export function olvidarClaveEnCache() {
  cache = null;
}

/** true si pide Santiago (sesión) o un agente con la clave correcta. */
export async function esAdmin(): Promise<boolean> {
  if (await getServerSession(authOptions)) return true;
  const clave = (await headers()).get("x-agente-clave");
  if (!clave || clave.length < 24) return false;
  const h = await hashGuardado();
  return !!h && h === hashClave(clave);
}
