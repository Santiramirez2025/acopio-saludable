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
    SELECT DISTINCT ON ("nombre") "nombre", "ok", "detalle", "fecha" FROM "CronCorrida"
    WHERE "nombre" NOT LIKE 'reintento-%' AND "nombre" NOT LIKE 'alerta-%' AND "nombre" NOT LIKE 'agente-%' AND "nombre" NOT LIKE 'orden-%' AND "nombre" NOT LIKE 'clave-%' ORDER BY "nombre", "fecha" DESC`;
}

/** Estado en texto, para el resumen diario y el panel. */
export async function estadoTexto(ahora = new Date()): Promise<string> {
  const ultimas = await ultimasCorridas().catch(() => [] as Corrida[]);
  const vencidas = new Set(tareasVencidas(ultimas, ahora).map((t) => t.nombre));
  return TAREAS.map((t) => {
    const u = ultimas.find((c) => c.nombre === t.nombre);
    const hora = u ? new Date(u.fecha).toLocaleString("es-AR", { timeZone: "America/Argentina/Cordoba", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca";
    const deHoy = u && new Date(u.fecha).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" }) === ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
    const icono = vencidas.has(t.nombre) ? "⚠️" : u && !u.ok ? "❌" : t.hasta !== null && !deHoy ? "⏳" : "✅";
    return `${icono} ${t.titulo}: ${hora}`;
  }).join("\n");
}

/** Corre de nuevo una tarea del día (import dinámico: evita dependencias circulares). */
async function correrTarea(nombre: string): Promise<void> {
  if (nombre === "listas") {
    const { actualizarDesdeLaGranja, avisarResultadoLista } = await import("./listas-aplicar");
    const r = await conRegistro("listas", () => actualizarDesdeLaGranja().then((x) => {
      if ("error" in x && !/ya se aplic/i.test(x.error)) throw new Error(x.error); // «ya se aplicó» = la del día ya está: está bien
      return x;
    }));
    await avisarResultadoLista(r);
  } else if (nombre === "organico") {
    const { correrOrganico } = await import("./organico");
    await conRegistro("organico", () => correrOrganico());
  } else if (nombre === "reactivacion") {
    const { correrReactivacion } = await import("./reactivacion");
    await conRegistro("reactivacion", () => correrReactivacion());
  } else if (nombre === "recompra") {
    const { correrRecompra } = await import("./recompra");
    await conRegistro("recompra", () => correrRecompra());
  } else if (nombre === "seguimiento") {
    const { correrSeguimiento } = await import("./seguimiento");
    await conRegistro("seguimiento", () => correrSeguimiento());
  }
}

export const MAX_REINTENTOS = 3;

/**
 * La llama el radar cada 15 minutos. Si una tarea del día no corrió o falló, la vuelve a correr sola
 * (hasta MAX_REINTENTOS veces por día, una por pasada). Solo si sigue fallando después de eso le avisa
 * a Santiago, una vez por día y por tarea. Los errores de código los revisa Claude cada mañana.
 */
export async function vigilar(ahora = new Date()): Promise<string[]> {
  const ultimas = await ultimasCorridas().catch(() => null);
  if (!ultimas) return [];
  const vencidas = tareasVencidas(ultimas, ahora).filter((t) => t.hasta !== null); // el radar se cura solo: es el que llama
  if (!vencidas.length) return [];
  const hoy = ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
  const hechas: string[] = [];
  for (const t of vencidas) {
    const clave = `reintento-${t.nombre}-${hoy}`;
    const [{ n }] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "CronCorrida" WHERE "nombre" = ${clave}`;
    if (Number(n) < MAX_REINTENTOS) {
      await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${clave}, true, ${`intento ${Number(n) + 1}`})`;
      await correrTarea(t.nombre).catch((e) => console.error("salud: reintento falló", t.nombre, e));
      hechas.push(`${t.nombre}:reintento${Number(n) + 1}`);
      continue;
    }
    const alerta = `alerta-${t.nombre}-${hoy}`;
    const [{ n: avisado }] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "CronCorrida" WHERE "nombre" = ${alerta}`;
    if (Number(avisado) > 0) continue;
    await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${alerta}, true, ${t.titulo})`;
    await avisarSantiago("Tarea automática con error", `⚠️ ${t.titulo} falló ${MAX_REINTENTOS} veces hoy. Claude lo revisa y lo arregla en la revisión de la mañana; no tenés que hacer nada.`);
    hechas.push(`${t.nombre}:aviso`);
  }
  return hechas;
}
