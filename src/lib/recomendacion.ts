// Recomendaciones: 5% para quien compra por primera vez con el link de un amigo,
// y 5% para quien recomendó, en su próxima compra, por cada amigo que compró.
// Acá va solo lo puro (sin base de datos) para poder probarlo.

export const PCT_RECOMENDACION = 5;

/** El código de amigo que trae el origen del pedido («link: amigo-ab12cd34 · 2026-10-18»), o null. */
export function codigoDeOrigen(origen: string | null | undefined): string | null {
  const m = /\bamigo-([a-z0-9]{4,12})\b/i.exec(origen ?? "");
  return m ? m[1].toLowerCase() : null;
}

/** Teléfono comparable: los últimos 10 dígitos (sin 0, 15, +54 ni 9 de celular). */
export function telefonoClave(t: string | null | undefined): string {
  const d = (t ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : d;
}

export function emailClave(e: string | null | undefined): string {
  return (e ?? "").trim().toLowerCase();
}

/** La marca que queda en el origen del pedido que usó un premio, para no usarlo dos veces. */
export const marcaPremio = (pedidoAmigoId: number) => `premio-amigo:${pedidoAmigoId}`;

export function premiosUsados(origenes: (string | null)[]): Set<number> {
  const usados = new Set<number>();
  for (const o of origenes) for (const m of (o ?? "").matchAll(/premio-amigo:(\d+)/g)) usados.add(Number(m[1]));
  return usados;
}
