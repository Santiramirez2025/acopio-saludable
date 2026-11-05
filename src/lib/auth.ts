import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { createHash } from "node:crypto";
import { gastarAcceso } from "./acceso";
import { avisarSantiago } from "./avisos";
import { decidirLogin } from "./freno";

// Hash de un valor al azar descartado: si el email no existe se compara igual, y la respuesta no delata qué emails son válidos.
const HASH_SEÑUELO = "$2a$10$p4MhGaRKPrhREdu/vEpcwu2HN9oGkURh9yT88wbyGD6xG7XeTIJy6";

/** Cuántos fallos hubo en la ventana, en total y desde esta IP. En la base, porque la memoria no se comparte entre instancias de Vercel. La IP se guarda solo como hash. */
async function fallosLogin(ipHash: string) {
  const [f] = await prisma.$queryRaw<{ total: number; ip: number }[]>`
    SELECT count(*)::int AS total, (count(*) FILTER (WHERE "detalle" = ${ipHash}))::int AS ip
    FROM "CronCorrida" WHERE "nombre" = 'login-fallido' AND "fecha" > now() - interval '15 minutes'`;
  return f ?? { total: 0, ip: 0 };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 60 },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "Administrador",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Contraseña", type: "password" } },
      async authorize(credentials, req) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;
        const ip = String(req?.headers?.["x-forwarded-for"] ?? "").split(",")[0].trim() || "desconocida";
        const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
        const fallos = await fallosLogin(ipHash);
        // Frenado: ni se compara la contraseña. El acceso aprobado por WhatsApp sigue abierto, así que nadie puede dejar afuera a Santiago.
        if (!decidirLogin(fallos).admite) return null;
        const user = await prisma.adminUser.findUnique({ where: { email } });
        const coincide = await bcrypt.compare(password, user?.passwordHash ?? HASH_SEÑUELO);
        if (!user || !coincide) {
          await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES ('login-fallido', false, ${ipHash})`.catch(() => undefined);
          if (decidirLogin(fallos).avisar) {
            await avisarSantiago("Intentos de entrar al panel", "🔐 Hay varios intentos fallidos de contraseña en el panel en los últimos 15 minutos, desde más de un origen. Si no fuiste vos, avisale a Rodri. El ingreso con contraseña se frena solo.").catch(() => undefined);
          }
          return null;
        }
        return { id: String(user.id), email: user.email };
      },
    }),
    // Acceso aprobado desde el WhatsApp de Santiago (ver lib/acceso.ts): entra como el primer administrador.
    CredentialsProvider({
      id: "aprobacion",
      name: "Aprobación por WhatsApp",
      credentials: { codigo: { label: "Código", type: "text" } },
      async authorize(credentials) {
        const codigo = credentials?.codigo ?? "";
        if (!codigo || !(await gastarAcceso(codigo))) return null;
        const user = await prisma.adminUser.findFirst({ orderBy: { id: "asc" } });
        return user ? { id: String(user.id), email: user.email } : null;
      },
    }),
  ],
};

/** Toda acción y página del panel pasa por acá: sin sesión no hay datos ni escritura. */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("No autorizado");
  return session;
}
