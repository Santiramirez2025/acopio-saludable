import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "Administrador",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Contraseña", type: "password" } },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;
        const user = await prisma.adminUser.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
        return { id: String(user.id), email: user.email };
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
