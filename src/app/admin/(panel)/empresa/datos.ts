// Datos de la oficina (los usa la vista normal y la oficina 3D). La empresa por dentro: el equipo de agentes como personas, qué hace cada uno, si trabajó hoy, qué
// informó, y la posibilidad de hablarle o dejarle una orden. Con ?tv=1 se ve a pantalla completa para
// tenerla en un televisor (se maneja con las flechas del control remoto).
import { prisma } from "@/lib/prisma";
import { pesos } from "@/lib/precios";
import { AGENTES, AREAS, ROBOTS, estadoAgente, type Area } from "@/lib/agentes";
import { estadoTexto } from "@/lib/salud";
import { diasHasta, proximaTemporada, temporadaActual } from "@/lib/temporada";
import type { AgenteVista, DatosOficina } from "./oficina";
import { lineasPizarra, pizarraArmado } from "@/lib/armado";


const TZ = "America/Argentina/Cordoba";
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function enAr(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  const hora = `${Number(p.hour) % 24}:${p.minute}`;
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora, min: (Number(p.hour) % 24) * 60 + Number(p.minute), dia: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday) };
}

function cuando(d: Date, hoy: string): string {
  const x = enAr(d);
  if (x.fecha === hoy) return `hoy ${x.hora}`;
  return `${DIAS[x.dia]} ${x.fecha.slice(8)}/${x.fecha.slice(5, 7)} ${x.hora}`;
}

function dias(ds: number[]): string {
  if (ds.length === 7) return "Todos los días";
  if (ds.join() === "1,2,3,4,5,6") return "Lunes a sábado";
  return ds.map((d) => DIAS[d]).join(", ");
}

type Fila = { nombre: string; ok: boolean; detalle: string | null; fecha: Date };

export async function cargarOficina(): Promise<DatosOficina> {
  const ahora = new Date();
  const hoy = enAr(ahora);
  const hace7 = new Date(ahora.getTime() - 7 * 86_400_000);
  const inicioHoy = new Date(`${hoy.fecha}T00:00:00-03:00`);

  const [filas, pedidos7, pedidosHoy, charlasHoy, charlas7, negocios7, salud] = await Promise.all([
    prisma.$queryRaw<Fila[]>`SELECT "nombre", "ok", "detalle", "fecha" FROM "CronCorrida" WHERE ("nombre" LIKE 'agente-%' OR "nombre" LIKE 'orden-%') AND "fecha" >= ${hace7} ORDER BY "fecha" DESC LIMIT 400`.catch(() => [] as Fila[]),
    prisma.order.findMany({ where: { createdAt: { gte: hace7 }, estado: { not: "CANCELADO" } }, select: { total: true } }).catch(() => []),
    prisma.order.count({ where: { createdAt: { gte: inicioHoy }, estado: { not: "CANCELADO" } } }).catch(() => 0),
    prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "WhatsappConversacion" WHERE "creado" >= ${inicioHoy} AND "prospecto" IS NULL`.then((r) => r[0]?.n ?? 0).catch(() => 0),
    prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "WhatsappConversacion" WHERE "creado" >= ${hace7} AND "prospecto" IS NULL`.then((r) => r[0]?.n ?? 0).catch(() => 0),
    prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "WhatsappConversacion" WHERE "contactado" >= ${hace7}`.then((r) => r[0]?.n ?? 0).catch(() => 0),
    estadoTexto(ahora).catch(() => ""),
  ]);

  const facturado7 = pedidos7.reduce((s, o) => s + Math.round(Number(o.total) || 0), 0);
  const conversion = charlas7 ? Math.round((pedidos7.length / charlas7) * 100) : 0;
  const temporada = temporadaActual(ahora);
  const proxima = proximaTemporada(ahora);

  const agentes: AgenteVista[] = AGENTES.map((a) => {
    const informes = filas.filter((f) => f.nombre === `agente-${a.id}`);
    const u = informes[0];
    const e = estadoAgente(a, hoy, u ? { ...enAr(new Date(u.fecha)), ok: u.ok } : null);
    return {
      id: a.id,
      persona: a.persona,
      nombre: a.nombre,
      puesto: a.puesto,
      area: a.area,
      emoji: a.emoji,
      horario: `${dias(a.dias)} · ${a.horas.join(" y ")}`,
      mision: a.mision,
      hace: a.hace,
      mide: a.mide,
      estado: e.estado,
      estadoTexto: e.texto,
      informes: informes.slice(0, 6).map((i) => ({ cuando: cuando(new Date(i.fecha), hoy.fecha), ok: i.ok, texto: (i.detalle ?? "").slice(0, 5000) })),
      ordenes: filas.filter((f) => f.nombre === `orden-${a.id}`).slice(0, 10).map((o) => ({ cuando: cuando(new Date(o.fecha), hoy.fecha), texto: o.detalle ?? "" })),
    };
  });

  const gerente = agentes.find((a) => a.id === "gerente");
  const datos: DatosOficina = {
    hoy: `${DIAS_LARGOS[hoy.dia]} ${hoy.fecha.slice(8)}/${hoy.fecha.slice(5, 7)}`,
    hora: hoy.hora,
    kpis: [
      { titulo: "Pedidos hoy", valor: String(pedidosHoy) },
      { titulo: "Pedidos 7 días", valor: String(pedidos7.length) },
      { titulo: "Facturado 7 días", valor: pesos(facturado7) },
      { titulo: "Charlas nuevas hoy", valor: String(charlasHoy) },
      { titulo: "Charla → pedido", valor: `${conversion}%` },
      { titulo: "Negocios contactados (7 d)", valor: String(negocios7) },
    ],
    temporada: temporada
      ? `${temporada.nombre}${diasHasta(temporada, ahora) > 0 ? ` · faltan ${diasHasta(temporada, ahora)} días` : ""}`
      : "Sin temporada especial",
    proxima: proxima ? `${proxima.t.nombre} en ${proxima.empiezaEn} días` : "",
    parte: gerente?.informes[0] ? { cuando: gerente.informes[0].cuando, texto: gerente.informes[0].texto } : null,
    areas: (Object.keys(AREAS) as Area[]).map((id) => ({ id, nombre: AREAS[id].nombre, bajada: AREAS[id].bajada })),
    agentes,
    robots: ROBOTS,
    salud,
    armado: await pizarraArmado().then(lineasPizarra).catch(() => undefined),
  };

  return datos;
}
