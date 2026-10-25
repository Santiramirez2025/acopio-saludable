// Bitácora de los agentes de la empresa (ver lib/agentes.ts).
// Cada agente deja acá su informe del día; el Gerente los lee para armar un solo parte para Santiago.
// Solo administrador.
//   POST { agente, ok?, informe }  → guarda el informe (hasta 6000 caracteres)
//   GET  ?dias=1                    → informes de los últimos N días, del más nuevo al más viejo
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IDS_AGENTES } from "@/lib/agentes";

export const dynamic = "force-dynamic";

const AGENTES = IDS_AGENTES;

export async function POST(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { agente?: string; ok?: boolean; informe?: string };
  const agente = String(b.agente ?? "").toLowerCase().trim();
  if (!AGENTES.includes(agente)) return NextResponse.json({ error: `agente = ${AGENTES.join(" | ")}` }, { status: 400 });
  const informe = String(b.informe ?? "").trim().slice(0, 6000);
  if (!informe) return NextResponse.json({ error: "falta informe" }, { status: 400 });
  await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${`agente-${agente}`}, ${b.ok !== false}, ${informe})`;
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const dias = Math.min(30, Math.max(1, Number(new URL(req.url).searchParams.get("dias")) || 1));
  const desde = new Date(Date.now() - dias * 86_400_000);
  const filas = await prisma.$queryRaw<{ nombre: string; ok: boolean; detalle: string | null; fecha: Date }[]>`
    SELECT "nombre", "ok", "detalle", "fecha" FROM "CronCorrida"
    WHERE "nombre" LIKE 'agente-%' AND "fecha" >= ${desde} ORDER BY "fecha" DESC LIMIT 200`;
  return NextResponse.json({
    informes: filas.map((f) => ({ agente: f.nombre.slice(7), ok: f.ok, fecha: f.fecha, informe: f.detalle })),
  });
}
