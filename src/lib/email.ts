// Emails transaccionales con Resend (REST). Variables: RESEND_API_KEY y EMAIL_FROM ("Acopio Saludable <pedidos@tudominio>").
// Sin esas variables no se envía nada y el pedido sigue su curso.

export const emailConfigurado = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export function escaparHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function enviarEmail(m: { para: string; asunto: string; html: string; responderA?: string | null }): Promise<boolean> {
  if (!emailConfigurado()) return false;
  try {
    const r = await fetch(`${(process.env.RESEND_API_URL || "https://api.resend.com").replace(/\/$/, "")}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [m.para], subject: m.asunto, html: m.html, ...(m.responderA ? { reply_to: m.responderA } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.error(`Email: HTTP ${r.status}`);
    return r.ok;
  } catch (e) {
    console.error("Email: no se pudo enviar", e);
    return false;
  }
}
