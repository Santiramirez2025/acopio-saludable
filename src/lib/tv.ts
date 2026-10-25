// Ver la oficina en CUALQUIER TV (también las que no tienen Chromecast): la TV abre acopiosaludable.com/tv,
// muestra un código de 6 números, Santiago lo carga desde el panel y la TV queda vinculada 30 días.
// La TV solo puede ver la oficina y hablar con los agentes: nada más del panel.
import { createHash, randomBytes, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const COOKIE_TV = "acopio_tv";
const DIAS_SESION = 30;
const MIN_CODIGO = 10;

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

type Codigo = { secreto: string; aprobado: boolean; usado?: boolean };

async function leerCodigo(codigo: string): Promise<{ d: Codigo; fecha: Date } | null> {
  const desde = new Date(Date.now() - MIN_CODIGO * 60_000);
  const r = await prisma.$queryRaw<{ detalle: string | null; fecha: Date }[]>`SELECT "detalle", "fecha" FROM "CronCorrida" WHERE "nombre" = ${`tv-${codigo}`} AND "fecha" >= ${desde} ORDER BY "fecha" DESC LIMIT 1`;
  if (!r[0]?.detalle) return null;
  try {
    return { d: JSON.parse(r[0].detalle) as Codigo, fecha: r[0].fecha };
  } catch {
    return null;
  }
}

async function escribirCodigo(codigo: string, d: Codigo) {
  await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${`tv-${codigo}`}, ${d.aprobado}, ${JSON.stringify(d)})`;
}

/** La TV pide un código nuevo. */
export async function crearCodigo(): Promise<{ codigo: string; secreto: string }> {
  for (let i = 0; i < 5; i++) {
    const codigo = String(randomInt(100000, 1000000));
    if (await leerCodigo(codigo)) continue;
    const secreto = randomBytes(18).toString("base64url");
    await escribirCodigo(codigo, { secreto, aprobado: false });
    return { codigo, secreto };
  }
  throw new Error("No pude generar un código, probá de nuevo");
}

/** Santiago aprueba el código que ve en la TV. */
export async function vincularCodigo(codigo: string): Promise<boolean> {
  const c = await leerCodigo(codigo.replace(/\D/g, ""));
  if (!c || c.d.usado) return false;
  await escribirCodigo(codigo, { ...c.d, aprobado: true });
  return true;
}

/** La TV pregunta si ya la aprobaron. Si sí, devuelve el token de sesión (una sola vez). */
export async function canjearCodigo(codigo: string, secreto: string): Promise<{ estado: "esperando" | "listo" | "vencido"; token?: string }> {
  const c = await leerCodigo(codigo);
  if (!c || c.d.secreto !== secreto || c.d.usado) return { estado: "vencido" };
  if (!c.d.aprobado) return { estado: "esperando" };
  await escribirCodigo(codigo, { ...c.d, usado: true });
  const token = randomBytes(32).toString("base64url");
  await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${`tvsesion-${sha(token)}`}, true, ${"tv vinculada"})`;
  return { estado: "listo", token };
}

export const opcionesCookieTv = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: DIAS_SESION * 86_400 };

/** true si este navegador es una TV vinculada (sesión de 30 días). */
export async function esTv(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_TV)?.value;
  if (!token || token.length < 30) return false;
  const desde = new Date(Date.now() - DIAS_SESION * 86_400_000);
  const r = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "CronCorrida" WHERE "nombre" = ${`tvsesion-${sha(token)}`} AND "fecha" >= ${desde}`.catch(() => [{ n: 0 }]);
  return (r[0]?.n ?? 0) > 0;
}
