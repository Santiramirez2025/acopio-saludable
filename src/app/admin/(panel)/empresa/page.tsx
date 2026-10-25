// La empresa por dentro: el equipo de agentes, qué hace cada uno, si ya trabajó hoy y qué informó.
// Pensada para que cualquiera la entienda de un vistazo, también desde el celular.
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { pesos } from "@/lib/precios";
import { AGENTES, AREAS, ROBOTS, estadoAgente, type Area, type EstadoAgente } from "@/lib/agentes";
import { estadoTexto } from "@/lib/salud";
import { diasHasta, proximaTemporada, temporadaActual } from "@/lib/temporada";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Empresa" };

const TZ = "America/Argentina/Cordoba";
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function enAr(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  const hora = `${Number(p.hour) % 24}:${p.minute}`;
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora, min: (Number(p.hour) % 24) * 60 + Number(p.minute), dia: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday) };
}

function dias(ds: number[]): string {
  if (ds.length === 7) return "Todos los días";
  if (ds.join() === "1,2,3,4,5,6") return "Lunes a sábado";
  return ds.map((d) => DIAS[d]).join(", ");
}

const COLOR: Record<EstadoAgente["estado"], string> = {
  ok: "bg-emerald-100 text-emerald-800",
  falla: "bg-red-100 text-red-800",
  atrasado: "bg-amber-100 text-amber-900",
  pendiente: "bg-sky-100 text-sky-800",
  descanso: "bg-stone-100 text-stone-600",
};

type Informe = { nombre: string; ok: boolean; detalle: string | null; fecha: Date };

export default async function Empresa() {
  const ahora = new Date();
  const hoy = enAr(ahora);
  const hace7 = new Date(ahora.getTime() - 7 * 86_400_000);
  const inicioHoy = new Date(`${hoy.fecha}T00:00:00-03:00`);

  const [informes, pedidos7, pedidosHoy, charlasHoy, charlas7, negocios7, salud] = await Promise.all([
    prisma.$queryRaw<Informe[]>`SELECT "nombre", "ok", "detalle", "fecha" FROM "CronCorrida" WHERE "nombre" LIKE 'agente-%' AND "fecha" >= ${hace7} ORDER BY "fecha" DESC`.catch(() => [] as Informe[]),
    prisma.order.findMany({ where: { createdAt: { gte: hace7 }, estado: { not: "CANCELADO" } }, select: { total: true, telefono: true } }).catch(() => []),
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

  const ultimoDe = (id: string) => informes.find((i) => i.nombre === `agente-${id}`) ?? null;
  const estados = AGENTES.map((a) => {
    const u = ultimoDe(a.id);
    const e = estadoAgente(a, hoy, u ? { ...enAr(new Date(u.fecha)), ok: u.ok } : null);
    return { a, u, e };
  });
  const trabajando = estados.filter((x) => x.e.estado !== "descanso").length;
  const cumplieron = estados.filter((x) => x.e.estado === "ok").length;
  const problemas = estados.filter((x) => x.e.estado === "falla" || x.e.estado === "atrasado");

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">Acopio Saludable · la empresa</h1>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">
          Un equipo de agentes con inteligencia artificial trabaja todos los días: cada uno tiene un puesto, un horario y una misión, y deja su informe acá.
          El foco de hoy es <b>conseguir clientes nuevos y vender más</b>. Santiago solo prende y apaga los anuncios de Meta, hace las compras con plata y reparte.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi valor={String(pedidosHoy)} titulo="Pedidos hoy" />
        <Kpi valor={String(pedidos7.length)} titulo="Pedidos 7 días" />
        <Kpi valor={pesos(facturado7)} titulo="Facturado 7 días" />
        <Kpi valor={String(charlasHoy)} titulo="Charlas nuevas hoy" />
        <Kpi valor={`${conversion}%`} titulo="Charlas → pedido (7 días)" />
        <Kpi valor={String(negocios7)} titulo="Negocios contactados 7 días" />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="tarjeta md:col-span-2">
          <h2 className="text-sm font-semibold">Hoy, {DIAS[hoy.dia]} {hoy.fecha.slice(8)}/{hoy.fecha.slice(5, 7)} · {hoy.hora}</h2>
          <p className="mt-1 text-sm text-stone-700">
            {cumplieron} de {trabajando} agentes ya trabajaron hoy.
            {problemas.length > 0 ? ` Atención: ${problemas.map((p) => p.a.nombre).join(", ")}.` : " Sin problemas."}
          </p>
        </div>
        <div className="tarjeta">
          <h2 className="text-sm font-semibold">Fecha comercial</h2>
          <p className="mt-1 text-sm text-stone-700">
            {temporada ? <>Estamos en <b>{temporada.nombre}</b>{diasHasta(temporada, ahora) > 0 ? ` · faltan ${diasHasta(temporada, ahora)} días` : ""}.</> : "Sin temporada especial."}
            {proxima ? <> Después viene <b>{proxima.t.nombre}</b> (en {proxima.empiezaEn} días).</> : null}
          </p>
        </div>
      </section>

      {(Object.keys(AREAS) as Area[]).map((area) => (
        <section key={area}>
          <h2 className="text-lg font-semibold">{AREAS[area].nombre}</h2>
          <p className="mb-3 text-sm text-stone-600">{AREAS[area].bajada}</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {estados.filter((x) => x.a.area === area).map(({ a, u, e }) => (
              <article key={a.id} className="tarjeta flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <span className="text-3xl leading-none" aria-hidden>{a.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{a.nombre}</h3>
                    <p className="text-xs text-stone-500">{a.puesto} · {dias(a.dias)} · {a.horas.join(" y ")}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${COLOR[e.estado]}`}>{e.texto}</span>
                </div>
                <p className="text-sm">{a.mision}</p>
                <ul className="list-disc pl-5 text-sm text-stone-700">
                  {a.hace.map((h) => <li key={h}>{h}</li>)}
                </ul>
                <p className="text-xs text-stone-500">Se mide por: {a.mide}</p>
                {u?.detalle ? (
                  <details className="rounded-lg bg-stone-50 p-2 text-sm">
                    <summary className="cursor-pointer text-xs font-medium text-acopio-700">Último informe · {enAr(new Date(u.fecha)).fecha.slice(5).split("-").reverse().join("/")} {enAr(new Date(u.fecha)).hora}</summary>
                    <p className="mt-2 whitespace-pre-wrap text-stone-700">{u.detalle}</p>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2 className="text-lg font-semibold">Robots automáticos</h2>
        <p className="mb-3 text-sm text-stone-600">Tareas que corren solas en el servidor, sin intervención. Los agentes trabajan encima de ellas.</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ROBOTS.map((r) => (
            <div key={r.nombre} className="tarjeta">
              <h3 className="text-sm font-semibold">⚙️ {r.nombre}</h3>
              <p className="text-xs text-stone-500">{r.cuando}</p>
              <p className="mt-1 text-sm text-stone-700">{r.hace}</p>
            </div>
          ))}
        </div>
        {salud ? <pre className="tarjeta mt-3 whitespace-pre-wrap text-xs text-stone-700">{salud}</pre> : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Bitácora de la semana</h2>
        <div className="mt-3 space-y-2">
          {informes.slice(0, 40).map((i, n) => {
            const a = AGENTES.find((x) => `agente-${x.id}` === i.nombre);
            const f = enAr(new Date(i.fecha));
            return (
              <details key={n} className="tarjeta text-sm">
                <summary className="cursor-pointer">
                  <span className="mr-2">{a?.emoji ?? "•"}</span>
                  <b>{a?.nombre ?? i.nombre}</b> · {f.fecha.slice(5).split("-").reverse().join("/")} {f.hora} {i.ok ? "" : "· ⚠️ problema"}
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-stone-700">{i.detalle}</p>
              </details>
            );
          })}
          {informes.length === 0 ? <p className="text-sm text-stone-500">Todavía no hay informes.</p> : null}
        </div>
      </section>
    </div>
  );
}

function Kpi({ valor, titulo }: { valor: string; titulo: string }) {
  return (
    <div className="tarjeta">
      <div className="text-xl font-semibold tabular-nums">{valor}</div>
      <div className="text-xs text-stone-600">{titulo}</div>
    </div>
  );
}
