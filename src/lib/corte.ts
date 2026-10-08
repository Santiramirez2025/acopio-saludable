// Corte de compra: día y hora hasta la que un pedido entra en la próxima compra al proveedor.
// Es un dato real del negocio (se configura en el panel); la tienda solo lo muestra como cuenta regresiva.

const DESFASE_MS = 3 * 60 * 60 * 1000; // Argentina: UTC-3 todo el año

/** "1,2,3,4,5" → [1,2,3,4,5] (0 = domingo … 6 = sábado). Vacío = sin corte. */
export function leerDiasCorte(texto: string | null | undefined): number[] {
  return [...new Set((texto ?? "").split(/[^0-9]+/).filter(Boolean).map(Number).filter((n) => n >= 0 && n <= 6))].sort();
}

/** Próximo corte posterior a `ahora`, o null si no hay días configurados. */
export function proximoCorte(ahora: Date, dias: number[], hora: number): Date | null {
  if (!dias.length || !(hora >= 0 && hora <= 23)) return null;
  const local = new Date(ahora.getTime() - DESFASE_MS); // sus campos UTC son la hora argentina
  for (let d = 0; d <= 7; d++) {
    const c = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + d, hora, 0, 0));
    if (dias.includes(c.getUTCDay()) && c.getTime() > local.getTime()) return new Date(c.getTime() + DESFASE_MS);
  }
  return null;
}
