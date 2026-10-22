// Captación orgánica: lo puro (sin base ni red), separado para poder probarlo.
//
// Cada día se contactan pocos negocios por WhatsApp (una plantilla aprobada por Meta) y se mira
// quién contestó. Con eso el sistema aprende solo a qué rubro conviene escribirle: el que más
// responde recibe más mensajes, pero siempre queda una parte para probar los otros.

export type EstadoProspecto = "nuevo" | "enviado" | "fallo" | "respondio" | "interesado" | "cliente" | "baja";

export type Candidato = { telefono: string; negocio: string; rubro: string; localidad: string | null; rating: number | null; resenas: number | null };
export type Resultado = { rubro: string; enviados: number; respondieron: number };

/** Cuántos negocios se contactan por día: pocos, para que Meta no vea una ráfaga y para poder atender a los que contestan. */
export const POR_DIA = 8;
/** Como mucho por rubro en un día, para no apostar todo a uno. */
export const TOPE_RUBRO = 4;

/** Celular argentino en el formato de WhatsApp (549 + 10 dígitos) a partir de lo que viene de Google o de una lista. */
export function celular(telefono: string | null | undefined): string | null {
  let d = (telefono ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("549")) return d.length === 13 ? d : null;
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  // 15 después de la característica (0351 15 ...): se saca.
  d = d.replace(/^(\d{2,4})15(\d{6,8})$/, "$1$2");
  return d.length === 10 ? `549${d}` : null;
}

/** Puntaje de un rubro: tasa de respuesta suavizada, así un rubro sin datos arranca con chance y uno con 0 de 10 cae. */
export function puntajeRubro(r: Resultado | undefined): number {
  const enviados = r?.enviados ?? 0;
  const respondieron = r?.respondieron ?? 0;
  return (respondieron + 1) / (enviados + 3);
}

/**
 * Elige a quién escribirle hoy. Ordena los rubros por lo que vienen respondiendo (con algo de azar
 * para seguir probando), y dentro de cada rubro prefiere los negocios mejor puntuados y con más reseñas
 * (son los que más venden). `azar` se inyecta para que la prueba sea determinista.
 */
export function elegirHoy(candidatos: Candidato[], resultados: Resultado[], cantidad = POR_DIA, azar: () => number = Math.random): Candidato[] {
  const porRubro = new Map<string, Candidato[]>();
  for (const c of candidatos) porRubro.set(c.rubro, [...(porRubro.get(c.rubro) ?? []), c]);
  for (const lista of porRubro.values()) lista.sort((a, b) => (b.rating ?? 0) * Math.log1p(b.resenas ?? 0) - (a.rating ?? 0) * Math.log1p(a.resenas ?? 0));
  const rubros = [...porRubro.keys()]
    .map((rubro) => ({ rubro, puntaje: puntajeRubro(resultados.find((r) => r.rubro === rubro)) * (0.7 + azar() * 0.6) }))
    .sort((a, b) => b.puntaje - a.puntaje)
    .map((r) => r.rubro);
  const salida: Candidato[] = [];
  const tomados = new Map<string, number>();
  // Repartido: una vuelta por rubro en orden de puntaje, hasta llenar el cupo.
  while (salida.length < cantidad) {
    let agregado = false;
    for (const rubro of rubros) {
      if (salida.length >= cantidad) break;
      const n = tomados.get(rubro) ?? 0;
      const lista = porRubro.get(rubro) ?? [];
      if (n >= TOPE_RUBRO || n >= lista.length) continue;
      salida.push(lista[n]);
      tomados.set(rubro, n + 1);
      agregado = true;
    }
    if (!agregado) break;
  }
  return salida;
}

/** Lo que el sistema aprendió, en el formato que entra a las instrucciones del vendedor. */
export function bloqueLecciones(lecciones: { texto: string; evidencia: string | null }[]): string {
  if (!lecciones.length) return "";
  return ["", "LO QUE APRENDIMOS DE LAS CHARLAS REALES (se actualiza solo cada día; pesa tanto como las reglas de arriba)", ...lecciones.map((l) => `- ${l.texto}${l.evidencia ? ` (${l.evidencia})` : ""}`)].join("\n");
}

/** Dos lecciones son la misma si comparten casi todas las palabras importantes. */
export function parecidas(a: string, b: string): boolean {
  const palabras = (t: string) => new Set(t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z0-9]{4,}/g) ?? []);
  const pa = palabras(a);
  const pb = palabras(b);
  if (!pa.size || !pb.size) return false;
  let comunes = 0;
  for (const p of pa) if (pb.has(p)) comunes++;
  return comunes / Math.min(pa.size, pb.size) >= 0.6;
}
