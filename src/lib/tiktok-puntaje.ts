// Cuentas puras del laboratorio TikTok (sin base de datos, para poder testearlas).

export type VideoTest = {
  id: number; video: string; receta: string; gancho: string | null; ia: boolean; programado: Date | null; url: string | null;
  estado: string; vistas: number | null; likes: number | null; comentarios: number | null; compartidos: number | null;
  guardados: number | null; retencion: number | null; puntaje: number | null; medido: Date | null; videoUrl: string | null;
  promovido: Date | null; nota: string | null; creado: Date;
};

/** Puntaje: vistas pesadas por cuánto interactúa la gente (compartir y guardar valen más que un like) y por retención. */
export function puntaje(m: { vistas?: number | null; likes?: number | null; comentarios?: number | null; compartidos?: number | null; guardados?: number | null; retencion?: number | null }): number {
  const v = Math.max(0, m.vistas ?? 0);
  if (!v) return 0;
  const inter = (m.likes ?? 0) + 2 * (m.comentarios ?? 0) + 3 * (m.compartidos ?? 0) + 3 * (m.guardados ?? 0);
  const tasa = inter / v;
  const ret = m.retencion != null ? Math.min(1, Math.max(0, m.retencion > 1 ? m.retencion / 100 : m.retencion)) : 0.3;
  return Math.round(v * (1 + 10 * tasa) * (0.5 + ret));
}

/** Gana la mejor de las medidas en las últimas 48 h si supera 1,5 veces la mediana de los últimos 14 días (y tiene al menos 300 vistas). */
export function elegirGanadoras(todas: VideoTest[], ahora = new Date()): VideoTest[] {
  const medidas = todas.filter((t) => t.puntaje != null && t.estado !== "DESCARTADO");
  const catorce = medidas.filter((t) => ahora.getTime() - new Date(t.creado).getTime() < 14 * 864e5).map((t) => t.puntaje as number).sort((a, b) => a - b);
  const mediana = catorce.length ? catorce[Math.floor(catorce.length / 2)] : 0;
  return medidas
    .filter((t) => t.estado === "MEDIDO" && !t.promovido && ahora.getTime() - new Date(t.medido ?? t.creado).getTime() < 48 * 3600e3)
    .filter((t) => (t.vistas ?? 0) >= 300 && (t.puntaje as number) >= Math.max(1, mediana * 1.5))
    .sort((a, b) => (b.puntaje as number) - (a.puntaje as number))
    .slice(0, 1);
}

