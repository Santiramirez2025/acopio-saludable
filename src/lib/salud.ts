// Salud de las tareas automáticas: cada cron deja registro y, si a media mañana una tarea del día
// no corrió (o falló), le llega un aviso a Santiago. Así nadie tiene que revisar los logs de Vercel.

import { prisma } from "./prisma";
import { avisarSantiago } from "./avisos";
import { tareasVencidas, TAREAS, type Corrida } from "./salud-reglas";

/** Corre una tarea, deja registro (ok o error) y devuelve su resultado. Si falla, el error se registra y se relanza. */
export async function conRegistro<T>(nombre: string, tarea: () => Promise<T>, resumen: (r: T) => string = (r) => JSON.stringify(r)): Promise<T> {
  try {
    const r = await tarea();
    await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${nombre}, true, ${resumen(r).slice(0, 500)})`.catch(() => null);
    return r;
  } catch (e) {
    await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${nombre}, false, ${String(e).slice(0, 500)})`.catch(() => null);
    throw e;
  }
}

/** Última corrida de cada tarea. */
export async function ultimasCorridas(): Promise<Corrida[]> {
  return prisma.$queryRaw<Corrida[]>`
    SELECT DISTINCT ON ("nombre") "nombre", "ok", "detalle", "fecha" FROM "CronCorrida" ORDER BY "nombre", "fecha" DESC`;
}

/** Estado en texto, para el resumen diario y el panel. */
export async function estadoTexto(ahora = new Date()): Promise<string> {
  const ultimas = await ultimasCorridas().catch(() => [] as Corrida[]);
  const vencidas = new Set(tareasVencidas(ultimas, ahora).map((t) => t.nombre));
  return TAREAS.map((t) => {
    const u = ultimas.find((c) => c.nombre === t.nombre);
    const hora = u ? new Date(u.fecha).toLocaleString("es-AR", { timeZone: "America/Argentina/Cordoba", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca";
    const icono = vencidas.has(t.nombre) ? "⚠️" : u && !u.ok ? "❌" : "✅";
    return `${icono} ${t.titulo}: ${hora}`;
  }).join("\n");
}

/** La llama el radar cada 15 minutos: si una tarea del día no corrió a tiempo, avisa una sola vez por día. */
export async function vigilar(ahora = new Date()): Promise<string[]> {
  const ultimas = await ultimasCorridas().catch(() => null);
  if (!ultimas) return [];
  const vencidas = tareasVencidas(ultimas, ahora);
  if (!vencidas.length) return [];
  const hoy = ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
  const clave = `alerta-${hoy}`;
  const ya = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "CronCorrida" WHERE "nombre" = ${clave}`;
  if (Number(ya[0]?.n ?? 0) > 0) return [];
  await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${clave}, true, ${vencidas.map((t) => t.nombre).join(",")})`;
  await avisarSantiago("Tarea automática sin correr", `⚠️ Hoy no corrió bien: ${vencidas.map((t) => t.titulo).join(", ")}. Ya quedó registrado para revisarlo.`);
  return vencidas.map((t) => t.nombre);
}
