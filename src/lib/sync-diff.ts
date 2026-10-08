// Cálculo del diff de una actualización de precios. Función pura: decide qué se aplica solo y qué espera aprobación.

export type Entrante = { codigo: string; producto: string; presentacion?: string; categoria?: string; costo: number | null; precioPublico: number | null; fotos?: string | null };
export type Actual = { codigo: string; producto: string; costo: number; precioPublico: number; estado: "ACTIVO" | "BORRADOR" | "SIN_STOCK" };

export type TipoCambio = "CAMBIO" | "NUEVO" | "DESAPARECIDO" | "REAPARECIDO";
export type ItemDiff = {
  codigo: string;
  producto: string;
  tipo: TipoCambio;
  costoAntes: number | null;
  costoNuevo: number | null;
  precioAntes: number | null;
  precioNuevo: number | null;
  pct: number | null;
  estado: "APLICADO" | "PENDIENTE";
};

const redondear2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function variacionPct(antes: number, nuevo: number): number {
  if (antes === nuevo) return 0;
  if (!(antes > 0)) return 100;
  return redondear2(((nuevo - antes) / antes) * 100);
}

/** Limpia lo recibido: códigos como texto, precios positivos, sin repetidos. Devuelve también cuántos se descartaron. */
export function sanearEntrantes(crudo: unknown): { items: Entrante[]; descartados: number } {
  if (!Array.isArray(crudo)) throw new Error("Se esperaba una lista de productos en \"items\"");
  if (crudo.length > 20000) throw new Error("Demasiados productos en una sola actualización");
  const mapa = new Map<string, Entrante>();
  let descartados = 0;
  const precio = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 && n < 1e9 ? redondear2(n) : NaN;
  };
  for (const x of crudo) {
    const o = (x ?? {}) as Record<string, unknown>;
    const codigo = typeof o.codigo === "string" ? o.codigo.trim() : typeof o.codigo === "number" ? String(o.codigo) : "";
    const costo = precio(o.costo);
    const precioPublico = precio(o.precioPublico);
    if (!codigo || codigo.length > 40 || Number.isNaN(costo) || Number.isNaN(precioPublico) || (costo === null && precioPublico === null) || mapa.has(codigo)) {
      descartados++;
      continue;
    }
    mapa.set(codigo, {
      codigo,
      producto: String(o.producto ?? "").trim().slice(0, 200) || codigo,
      presentacion: String(o.presentacion ?? "").trim().slice(0, 200),
      categoria: String(o.categoria ?? "").trim().slice(0, 80),
      costo,
      precioPublico,
      fotos: typeof o.fotos === "string" ? o.fotos.slice(0, 600) : null,
    });
  }
  return { items: [...mapa.values()], descartados };
}

export function calcularDiff(
  actuales: Actual[],
  entrantes: Entrante[],
  opciones: { umbralAutoPct: number; completo: boolean },
): { items: ItemDiff[]; avisos: string[] } {
  const porCodigo = new Map(actuales.map((a) => [a.codigo, a]));
  const recibidos = new Set(entrantes.map((e) => e.codigo));
  const items: ItemDiff[] = [];
  const avisos: string[] = [];

  for (const e of entrantes) {
    const a = porCodigo.get(e.codigo);
    if (!a) {
      // Producto nuevo: entra en borrador. Si solo llegó un precio, se usa para los dos y queda sin margen hasta revisarlo.
      const costoNuevo = e.costo ?? e.precioPublico!;
      const precioNuevo = e.precioPublico ?? e.costo!;
      items.push({ codigo: e.codigo, producto: e.producto, tipo: "NUEVO", costoAntes: null, costoNuevo, precioAntes: null, precioNuevo, pct: null, estado: "APLICADO" });
      continue;
    }
    const costoNuevo = e.costo ?? a.costo;
    const precioNuevo = e.precioPublico ?? a.precioPublico;
    const pctCosto = variacionPct(a.costo, costoNuevo);
    const pctPrecio = variacionPct(a.precioPublico, precioNuevo);
    if (pctCosto !== 0 || pctPrecio !== 0 || a.costo !== costoNuevo || a.precioPublico !== precioNuevo) {
      const pct = Math.abs(pctCosto) >= Math.abs(pctPrecio) ? pctCosto : pctPrecio;
      items.push({
        codigo: a.codigo,
        producto: a.producto,
        tipo: "CAMBIO",
        costoAntes: a.costo,
        costoNuevo,
        precioAntes: a.precioPublico,
        precioNuevo,
        pct,
        // "Menor a" el umbral se aplica solo; igual o mayor espera aprobación.
        estado: Math.abs(pct) < opciones.umbralAutoPct ? "APLICADO" : "PENDIENTE",
      });
    }
    if (a.estado === "SIN_STOCK") {
      items.push({ codigo: a.codigo, producto: a.producto, tipo: "REAPARECIDO", costoAntes: null, costoNuevo: null, precioAntes: null, precioNuevo: null, pct: null, estado: "APLICADO" });
    }
  }

  // Desaparecidos: solo si la lectura fue completa. Una lectura parcial no puede dejar productos sin stock.
  const activos = actuales.filter((a) => a.estado === "ACTIVO");
  const faltan = activos.filter((a) => !recibidos.has(a.codigo));
  if (faltan.length) {
    if (!opciones.completo) {
      avisos.push(`La lectura no fue completa: ${faltan.length} productos del catálogo no vinieron y no se tocaron.`);
    } else {
      // Si de golpe falta más del 10% del catálogo, es más probable un problema de lectura que una baja real: se pide aprobación.
      const masivo = faltan.length > Math.max(5, activos.length * 0.1);
      if (masivo) avisos.push(`Faltan ${faltan.length} productos de golpe: quedaron pendientes de aprobación en lugar de pasar solos a sin stock.`);
      for (const a of faltan) {
        items.push({ codigo: a.codigo, producto: a.producto, tipo: "DESAPARECIDO", costoAntes: a.costo, costoNuevo: null, precioAntes: a.precioPublico, precioNuevo: null, pct: null, estado: masivo ? "PENDIENTE" : "APLICADO" });
      }
    }
  }
  return { items, avisos };
}
