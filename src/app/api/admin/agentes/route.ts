// Bitácora de los agentes de la empresa (ver lib/agentes.ts). Solo administrador.
//   POST { agente, ok?, informe }  → guarda el informe del agente (hasta 6000 caracteres)
//   GET  ?dias=1                    → informes de los últimos N días, del más nuevo al más viejo.
//     Las órdenes viajan acá como notas del Gerente con una línea «PRIORIDAD: <agente> — <rótulo> …», que es
//     lo que cada agente lee al empezar. El rótulo dice ORDEN DE SANTIAGO solo si se verificó que la dejó él
//     (sesión del panel o su WhatsApp); las demás, ORDEN INTERNA (ver lib/orden-emisor.ts).
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AGENTES, IDS_AGENTES } from "@/lib/agentes";
import { POLITICA_COMERCIAL } from "@/lib/politica";
import { leerOrden, rotuloOrden } from "@/lib/orden-emisor";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { agente?: string; ok?: boolean; informe?: string };
  const agente = String(b.agente ?? "").toLowerCase().trim();
  if (!IDS_AGENTES.includes(agente)) return NextResponse.json({ error: `agente = ${IDS_AGENTES.join(" | ")}` }, { status: 400 });
  const informe = String(b.informe ?? "").trim().slice(0, 6000);
  if (!informe) return NextResponse.json({ error: "falta informe" }, { status: 400 });
  await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${`agente-${agente}`}, ${b.ok !== false}, ${informe})`;
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const dias = Math.min(30, Math.max(1, Number(new URL(req.url).searchParams.get("dias")) || 1));
  const desde = new Date(Date.now() - Math.max(dias, 7) * 86_400_000);
  const filas = await prisma.$queryRaw<{ nombre: string; ok: boolean; detalle: string | null; fecha: Date }[]>`
    SELECT "nombre", "ok", "detalle", "fecha" FROM "CronCorrida"
    WHERE ("nombre" LIKE 'agente-%' OR "nombre" LIKE 'orden-%') AND "fecha" >= ${desde} ORDER BY "fecha" DESC LIMIT 300`;
  const limite = Date.now() - dias * 86_400_000;
  // Tope de órdenes por destinatario: el 3/11 había 203 órdenes vivas y cada agente las leía todas al arrancar.
  // Eso quema el límite de uso, entierra la orden nueva abajo de las viejas y hace que dos órdenes se contradigan.
  // Se quedan las más nuevas de cada destinatario (las filas ya vienen de la más nueva a la más vieja).
  const TOPE_ORDENES = 12;
  const vistas = new Map<string, number>();
  const ordenVigente = (nombre: string) => {
    const n = (vistas.get(nombre) ?? 0) + 1;
    vistas.set(nombre, n);
    return n <= TOPE_ORDENES;
  };
  const informes = filas
    // Las órdenes se muestran siempre (últimos 7 días, las más nuevas); los informes, según ?dias.
    .filter((f) => (f.nombre.startsWith("orden-") ? ordenVigente(f.nombre) : new Date(f.fecha).getTime() >= limite))
    .map((f) =>
      f.nombre.startsWith("orden-")
        ? {
            agente: "gerente",
            ok: true,
            fecha: f.fecha,
            informe: (({ emisor, texto }) => `PRIORIDAD: ${f.nombre.slice(6)} — ${rotuloOrden(emisor)} (${new Date(f.fecha).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Cordoba" })}): ${texto}`)(leerOrden(f.detalle)),
          }
        : { agente: f.nombre.slice(7), ok: f.ok, fecha: f.fecha, informe: f.detalle },
    );
  // La política comercial vigente va siempre primera: cada agente la lee al empezar su corrida.
  // Las reglas de cada puesto (las mismas del chat y la voz) también llegan a las corridas programadas.
  for (const a of [...AGENTES].reverse()) if (a.reglas) informes.unshift({ agente: "gerente", ok: true, fecha: new Date(), informe: `PRIORIDAD: ${a.id} — REGLAS PERMANENTES DE TU PUESTO (de Santiago): ${a.reglas}` });
  informes.unshift({ agente: "gerente", ok: true, fecha: new Date(), informe: `PRIORIDAD: todos — ORDEN PERMANENTE DE SANTIAGO: ${POLITICA_COMERCIAL}` });
  return NextResponse.json({ informes });
}
