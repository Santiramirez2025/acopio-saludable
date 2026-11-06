// Quién puede disparar un cron. Con CRON_SECRET: solo quien trae «Bearer <secreto>» (Vercel lo manda solo).
// Sin CRON_SECRET: solo quien se presenta como el programador de Vercel. Ese encabezado se puede falsificar:
// frena a un barrido o a un curioso, no a alguien decidido. Es un puente hasta cargar el secreto.
import { igualesSeguro } from "./freno";

export function cronAutorizado(req: Request, secreto: string | undefined = process.env.CRON_SECRET): boolean {
  if (secreto?.trim()) return igualesSeguro(req.headers.get("authorization") ?? "", `Bearer ${secreto}`);
  return (req.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
}
