// Quién puede disparar un cron. Con CRON_SECRET: solo quien trae «Bearer <secreto>» (Vercel lo manda solo).
// Sin CRON_SECRET: solo quien se presenta como el programador de Vercel. Ese encabezado se puede falsificar:
// frena a un barrido o a un curioso, no a alguien decidido. Es un puente hasta cargar el secreto.
import { igualesSeguro } from "./freno";

export function cronAutorizado(req: Request, secreto: string | undefined = process.env.CRON_SECRET): boolean {
  if (secreto?.trim()) return igualesSeguro(req.headers.get("authorization") ?? "", `Bearer ${secreto}`);
  return (req.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
}

/**
 * Recordatorios de WhatsApp (/api/whatsapp/recordatorios): los dispara GitHub Actions, no Vercel, así que no hay
 * encabezado de Vercel que mirar. Con RECORDATORIOS_SECRET cargado: solo «Bearer <secreto>» (el workflow lo manda
 * desde el secreto de GitHub del mismo nombre). Sin cargar: queda abierta como hasta ahora, para no cortar los
 * recordatorios antes de que estén los dos lados; la ruta igual frena por IP.
 */
export function recordatoriosAutorizado(req: Request, secreto: string | undefined = process.env.RECORDATORIOS_SECRET): boolean {
  if (secreto?.trim()) return igualesSeguro(req.headers.get("authorization") ?? "", `Bearer ${secreto}`);
  return true;
}

/** Sin secreto, cada IP puede dispararla pocas veces: el programador la llama 1 vez cada 30 minutos. */
export const RECORDATORIOS_MAX_POR_IP = 3;
export const RECORDATORIOS_VENTANA_MS = 10 * 60_000;
