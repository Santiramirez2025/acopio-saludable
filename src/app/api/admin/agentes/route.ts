// Bitácora de los agentes de la empresa (ver lib/agentes.ts). Solo administrador.
//   POST { agente, ok?, informe }  → guarda el informe del agente (hasta 6000 caracteres)
//   GET  ?dias=1                    → informes de los últimos N días, del más nuevo al más viejo.
//     Las órdenes que Santiago deja desde /admin/empresa viajan acá como notas del Gerente con una
//     línea «PRIORIDAD: <agente> — ORDEN DE SANTIAGO …», que es lo que cada agente lee al empezar.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IDS_AGENTES } from "@/lib/agentes";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { agente?: string; ok?: boolean; informe?: string };
  const agente = String(b.agente ?? "").toLowerCase().trim();
  if (!IDS_AGENTES.includes(agente)) return NextResponse.json({ error: `agente = ${IDS_AGENTES.join(" | ")}` }, { status: 400 });
  const informe = String(b.informe ?? "").trim().slice(0, 6000);
  if (!informe) return NextResponse.json({ error: "falta informe" }, { status: 400 });
  await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${`agente-${agente}`}, ${b.ok !== false}, ${informe})`;
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const dias = Math.min(30, Math.max(1, Number(new URL(req.url).searchParams.get("dias")) || 1));
  const desde = new Date(Date.now() - Math.max(dias, 7) * 86_400_000);
  const filas = await prisma.$queryRaw<{ nombre: string; ok: boolean; detalle: string | null; fecha: Date }[]>`
    SELECT "nombre", "ok", "detalle", "fecha" FROM "CronCorrida"
    WHERE ("nombre" LIKE 'agente-%' OR "nombre" LIKE 'orden-%') AND "fecha" >= ${desde} ORDER BY "fecha" DESC LIMIT 300`;
  const limite = Date.now() - dias * 86_400_000;
  const informes = filas
    // Las órdenes de Santiago se muestran siempre (últimos 7 días); los informes, según ?dias.
    .filter((f) => f.nombre.startsWith("orden-") || new Date(f.fecha).getTime() >= limite)
    .map((f) =>
      f.nombre.startsWith("orden-")
        ? {
            agente: "gerente",
            ok: true,
            fecha: f.fecha,
            informe: `PRIORIDAD: ${f.nombre.slice(6)} — ORDEN DE SANTIAGO (${new Date(f.fecha).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Cordoba" })}): ${f.detalle}`,
          }
        : { agente: f.nombre.slice(7), ok: f.ok, fecha: f.fecha, informe: f.detalle },
    );
  return NextResponse.json({ informes });
}
