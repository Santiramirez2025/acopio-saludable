// Qué tareas automáticas tienen que correr y cuándo. Puro (sin base): se prueba sin gastar.

export type Corrida = { nombre: string; ok: boolean; detalle: string | null; fecha: Date };
export type Tarea = { nombre: string; titulo: string; /** Hora argentina en que tiene que haber corrido (con margen). null = cada 15 min. */ hasta: number | null; domingo: boolean };

export const TAREAS: Tarea[] = [
  { nombre: "listas", titulo: "Precios de La Granja (7:40)", hasta: 9, domingo: false },
  { nombre: "organico", titulo: "Captación de negocios (9:05)", hasta: 10, domingo: false },
  { nombre: "reactivacion", titulo: "Reactivación de leads (9:30)", hasta: 10.5, domingo: false },
  { nombre: "seguimiento", titulo: "Seguimiento de carritos (11:00)", hasta: 12, domingo: false },
  { nombre: "radar", titulo: "Radar de Instagram (cada 15 min)", hasta: null, domingo: true },
];

function horaAr(d: Date): { dia: string; hora: number; domingo: boolean } {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Cordoba", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { dia: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour) % 24 + Number(p.minute) / 60, domingo: p.weekday === "Sun" };
}

/** Las tareas que ya tendrían que haber corrido bien hoy y no lo hicieron. */
export function tareasVencidas(ultimas: Corrida[], ahora = new Date()): Tarea[] {
  const a = horaAr(ahora);
  return TAREAS.filter((t) => {
    const u = ultimas.find((c) => c.nombre === t.nombre);
    if (t.hasta === null) {
      // El radar trabaja de 9 a 22: si en ese horario pasó más de una hora sin correr, algo anda mal.
      if (a.hora < 10 || a.hora > 22) return false;
      return !u || ahora.getTime() - new Date(u.fecha).getTime() > 60 * 60_000;
    }
    if (a.domingo && !t.domingo) return false;
    if (a.hora < t.hasta) return false;
    if (!u) return true;
    return horaAr(new Date(u.fecha)).dia !== a.dia || !u.ok;
  });
}
