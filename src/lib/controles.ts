// Qué secretos críticos existen en este entorno, sin leer ni exponer su valor: solo sí o no.
// Sirve para no tener que preguntarle a Santiago lo que el propio runtime puede contestar.
// Solo los nombres de esta lista: nada que un llamador pueda elegir.
const CRITICOS = ["MP_WEBHOOK_SECRET", "CRON_SECRET", "WHATSAPP_APP_SECRET", "WHATSAPP_VERIFY_TOKEN", "NEXTAUTH_SECRET"] as const;

export function secretosPresentes(env: Record<string, string | undefined> = process.env): Record<(typeof CRITICOS)[number], boolean> {
  return Object.fromEntries(CRITICOS.map((n) => [n, Boolean(env[n]?.trim())])) as Record<(typeof CRITICOS)[number], boolean>;
}
