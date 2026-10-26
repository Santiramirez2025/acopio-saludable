// Regla de Santiago para todo lo que escribe el bot.

/** El bot nunca dice «perfecto» (regla de Santiago): si se le escapa, se cambia antes de mandar. */
export function sinPerfecto(t: string): string {
  return t.replace(/\b(P|p)erfect[oa]\b([!.,]?)/g, (_m, p: string, sig: string) => `${p === "P" ? "Genial" : "genial"}${sig}`);
}
