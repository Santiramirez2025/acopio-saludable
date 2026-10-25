// Genera una clave nueva para los agentes (invalida la anterior) y la devuelve UNA sola vez.
// Solo con la sesión de Santiago. POST → { clave }
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashClave, olvidarClaveEnCache } from "@/lib/admin-acceso";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const clave = `ag_${randomBytes(24).toString("base64url")}`;
  await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES ('clave-agentes', true, ${hashClave(clave)})`;
  olvidarClaveEnCache();
  return NextResponse.json({ clave });
}
