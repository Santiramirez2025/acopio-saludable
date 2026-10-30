// Comprobantes de transferencia: cuando el cliente manda la captura o el PDF, se lee (monto, fecha, a quién,
// número de operación) y queda ANOTADO en su pedido, con aviso a Santiago. Así nadie le cobra dos veces en la
// puerta (le pasó a Beatriz el 26/10) y Santiago sabe qué pedido verificar.
// REGLA (seguridad, 30/10): una captura nunca confirma un pago. Un comprobante se edita en un minuto y la
// plata que no entró no se recupera (estafas con comprobantes falsos: Paraná 8/10, Sunchales 28/10/2026).
// El pago lo registra Santiago cuando ve la acreditación en su cuenta («Pagado» en el panel o «marcar pagado»
// por su WhatsApp). Hasta entonces el pedido sigue PENDIENTE_PAGO y no sale al reparto.
// Se anota SIN mandarle nada al cliente: la charla la sigue el vendedor con su propia respuesta.
import { telefonoFin } from "./telefono";

const GRAPH = "https://graph.facebook.com/v21.0";

export type Comprobante = { esComprobante: boolean; monto: number | null; fecha: string | null; destinatario: string | null; operacion: string | null };

/** ¿El monto del comprobante paga el pedido? Acepta una diferencia chica (redondeos, centavos). */
export function coincideMonto(monto: number, debe: number): boolean {
  if (!(monto > 0) || !(debe > 0)) return false;
  return Math.abs(monto - debe) <= Math.max(500, debe * 0.02);
}

/** Lo que el modelo devolvió → Comprobante (tolerante: «$ 47.660,00», «47660»). */
export function leerRespuestaComprobante(t: string): Comprobante | null {
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as Record<string, unknown>;
    const num = (v: unknown) => {
      if (typeof v === "number") return v > 0 ? Math.round(v) : null;
      const s = String(v ?? "").replace(/[^\d,.]/g, "");
      if (!s) return null;
      const limpio = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : /\.\d{3}(\D|$)/.test(s) ? s.replace(/\./g, "") : s;
      const n = Number(limpio);
      return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    };
    const txt = (v: unknown) => (v ? String(v).slice(0, 80) : null);
    return { esComprobante: Boolean(j.esComprobante ?? j.comprobante), monto: num(j.monto), fecha: txt(j.fecha), destinatario: txt(j.destinatario), operacion: txt(j.operacion) };
  } catch {
    return null;
  }
}

export async function bajarMedia(mediaId: string): Promise<{ bytes: ArrayBuffer; mime: string } | null> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token || !/^\d{5,30}$/.test(mediaId)) return null;
  const auth = { authorization: `Bearer ${token}` };
  const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: auth, signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!meta?.ok) return null;
  const { url, mime_type } = (await meta.json()) as { url?: string; mime_type?: string };
  if (!url) return null;
  const archivo = await fetch(url, { headers: auth, signal: AbortSignal.timeout(20_000) }).catch(() => null);
  if (!archivo?.ok) return null;
  const bytes = await archivo.arrayBuffer();
  return bytes.byteLength > 4_500_000 ? null : { bytes, mime: (mime_type ?? "image/jpeg").split(";")[0] };
}

/** Lee el comprobante (foto o PDF) con un modelo con visión. null si no se pudo. */
export async function leerComprobante(mediaId: string): Promise<Comprobante | null> {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return null;
  const m = await bajarMedia(mediaId);
  if (!m) return null;
  const datos = Buffer.from(m.bytes).toString("base64");
  const adjunto = m.mime === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: datos } }
    : { type: "image", source: { type: "base64", media_type: /png|webp|gif/.test(m.mime) ? m.mime : "image/jpeg", data: datos } };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.VENDEDOR_MODELO || "claude-haiku-5-5",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            adjunto,
            {
              type: "text",
              text:
                "¿Es un comprobante de transferencia o de pago (Mercado Pago, banco, billetera)? Respondé SOLO un JSON: " +
                '{"esComprobante": true/false, "monto": número en pesos sin símbolos, "fecha": "dd/mm/aaaa hh:mm", "destinatario": "a quién se pagó", "operacion": "número de operación"}. ' +
                "Lo que no se lea, null.",
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const j = (await res.json()) as { content?: { text?: string }[] };
  return leerRespuestaComprobante((j.content ?? []).map((b) => b.text ?? "").join(" "));
}

export type ResultadoComprobante =
  /** El monto coincide con lo que debe: queda anotado, pero el pago lo confirma Santiago contra su cuenta. */
  | { tipo: "coincide"; codigo: string; monto: number }
  | { tipo: "revisar"; codigo: string; monto: number | null; debe: number }
  | { tipo: "sin-pedido"; monto: number | null };

/** Texto que queda en el historial del pedido cuando llega un comprobante. Nunca marca el pago. */
export function notaComprobante(detalle: string, coincide: boolean): string {
  return coincide
    ? `Mandó comprobante (${detalle}): coincide con lo que debe. SIN VERIFICAR: confirmar la acreditación en la cuenta antes de pasarlo a Pagado o despacharlo.`
    : `Mandó comprobante (no coincide con lo que debe, revisar): ${detalle}`;
}

type PedidoAbierto = { id: number; estado: string; total: unknown; notas: string | null };

/** Lo que debe un pedido: el total o, si hay una nota «cobrar $X» (seña ya pagada), eso. */
export function debeDelPedido(o: PedidoAbierto): number {
  return Number(o.notas?.match(/cobrar\s*\$?\s*([\d.]+)/i)?.[1]?.replace(/\./g, "")) || Math.round(Number(o.total));
}

/** Texto del comprobante para el historial y los avisos: monto, fecha, destinatario y operación. */
export function detalleComprobante(c: Comprobante): string {
  return [c.monto ? `$ ${c.monto.toLocaleString("es-AR")}` : "monto sin leer", c.fecha, c.destinatario ? `a ${c.destinatario}` : null, c.operacion ? `op. ${c.operacion}` : null].filter(Boolean).join(" · ");
}

/**
 * Decide qué se anota con un comprobante (puro, sin base): a qué pedido va y si el monto coincide.
 * Decidir NUNCA significa cobrar: el resultado solo describe una nota para el historial.
 */
export function decidirComprobante<T extends PedidoAbierto>(abiertos: T[], c: Comprobante): { tipo: ResultadoComprobante["tipo"]; pedido: T | null; nota: string | null; debe: number | null } {
  const detalle = detalleComprobante(c);
  if (!abiertos.length) return { tipo: "sin-pedido", pedido: null, nota: null, debe: null };
  const pedido = abiertos.find((o) => c.monto && (coincideMonto(c.monto, Math.round(Number(o.total))) || coincideMonto(c.monto, debeDelPedido(o)))) ?? null;
  if (pedido && c.monto) return { tipo: "coincide", pedido, nota: notaComprobante(detalle, true), debe: debeDelPedido(pedido) };
  const o = abiertos[0];
  return { tipo: "revisar", pedido: o, nota: notaComprobante(detalle, false), debe: debeDelPedido(o) };
}

/**
 * Anota el comprobante en el pedido abierto de ese teléfono. No le manda nada al cliente y NO registra el pago:
 * eso lo hace Santiago cuando ve la plata acreditada (una captura se falsifica; la acreditación no).
 */
export async function aplicarComprobante(clave: string, c: Comprobante): Promise<ResultadoComprobante> {
  const { prisma } = await import("./prisma");
  const { numeroPedido } = await import("./pedido-calculos");
  const fin = telefonoFin(clave);
  const abiertos = (
    await prisma.order.findMany({
      where: { pagadoAt: null, estado: { notIn: ["CANCELADO", "ENTREGADO"] }, createdAt: { gte: new Date(Date.now() - 21 * 86_400_000) } },
      orderBy: { id: "desc" },
      take: 50,
    })
  ).filter((o) => telefonoFin(o.telefono) === fin);
  const d = decidirComprobante(abiertos, c);
  if (d.tipo === "sin-pedido" || !d.pedido || !d.nota) return { tipo: "sin-pedido", monto: c.monto };
  // Solo queda anotado en el historial: el estado del pedido y pagadoAt no se tocan.
  await prisma.orderEvent.create({ data: { orderId: d.pedido.id, estado: d.pedido.estado, nota: d.nota } });
  if (d.tipo === "coincide" && c.monto) return { tipo: "coincide", codigo: numeroPedido(d.pedido.id), monto: c.monto };
  return { tipo: "revisar", codigo: numeroPedido(d.pedido.id), monto: c.monto, debe: d.debe ?? Math.round(Number(d.pedido.total)) };
}
