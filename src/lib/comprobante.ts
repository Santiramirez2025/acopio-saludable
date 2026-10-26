// Comprobantes de transferencia: cuando el cliente manda la captura o el PDF, se lee (monto, fecha, a quién,
// número de operación) y, si coincide con su pedido, queda registrado el pago. Así nadie le cobra dos veces
// en la puerta (le pasó a Beatriz el 26/10). Si no coincide, queda anotado para revisar.
// Se registra SIN mandarle nada al cliente: la charla la sigue el vendedor con su propia respuesta.

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
  | { tipo: "registrado"; codigo: string; monto: number }
  | { tipo: "revisar"; codigo: string; monto: number | null; debe: number }
  | { tipo: "sin-pedido"; monto: number | null };

/** Aplica el comprobante al pedido abierto de ese teléfono. No le manda nada al cliente. */
export async function aplicarComprobante(clave: string, c: Comprobante): Promise<ResultadoComprobante> {
  const { prisma } = await import("./prisma");
  const { registrarPago } = await import("./pedidos");
  const { numeroPedido } = await import("./pedido-calculos");
  const fin = clave.replace(/\D/g, "").slice(-10);
  const abiertos = (
    await prisma.order.findMany({
      where: { pagadoAt: null, estado: { notIn: ["CANCELADO", "ENTREGADO"] }, createdAt: { gte: new Date(Date.now() - 21 * 86_400_000) } },
      orderBy: { id: "desc" },
      take: 50,
    })
  ).filter((o) => o.telefono.replace(/\D/g, "").endsWith(fin));
  const detalle = [c.monto ? `$ ${c.monto.toLocaleString("es-AR")}` : "monto sin leer", c.fecha, c.destinatario ? `a ${c.destinatario}` : null, c.operacion ? `op. ${c.operacion}` : null].filter(Boolean).join(" · ");
  if (!abiertos.length) return { tipo: "sin-pedido", monto: c.monto };
  // Lo que debe: el total o, si hay una nota «cobrar $X» (seña ya pagada), eso.
  const debeDe = (o: (typeof abiertos)[number]) => Number(o.notas?.match(/cobrar\s*\$?\s*([\d.]+)/i)?.[1]?.replace(/\./g, "")) || Math.round(Number(o.total));
  const pedido = abiertos.find((o) => c.monto && (coincideMonto(c.monto, Math.round(Number(o.total))) || coincideMonto(c.monto, debeDe(o)))) ?? null;
  if (pedido && c.monto) {
    await registrarPago(pedido.id, `Comprobante leído del chat: ${detalle}`, { avisarCliente: false });
    await prisma.order.updateMany({ where: { id: pedido.id, estado: "PENDIENTE_PAGO" }, data: { estado: "PAGADO" } });
    return { tipo: "registrado", codigo: numeroPedido(pedido.id), monto: c.monto };
  }
  const o = abiertos[0];
  await prisma.orderEvent.create({ data: { orderId: o.id, estado: o.estado, nota: `Mandó comprobante (no coincide con lo que debe, revisar): ${detalle}` } });
  return { tipo: "revisar", codigo: numeroPedido(o.id), monto: c.monto, debe: debeDe(o) };
}
