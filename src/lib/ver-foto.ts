// El cliente manda una foto (casi siempre la captura del anuncio o de un producto) en vez de escribir.
// Antes se le pedía que lo escribiera y se perdía la venta. Ahora el vendedor la mira: se baja de Meta
// y un modelo con visión la describe en una línea, que entra a la charla como si la hubiera escrito.

const GRAPH = "https://graph.facebook.com/v21.0";

/** Describe en una línea qué muestra la foto, pensando en qué quiere comprar. null si no se pudo. */
export async function describirFoto(mediaId: string): Promise<string | null> {
  return (await describirFotoConMotivo(mediaId)).texto;
}

/** Igual que describirFoto pero dice por qué falló (para probarla desde el panel). */
export async function describirFotoConMotivo(mediaId: string): Promise<{ texto: string | null; motivo?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!token || !clave || !/^\d{5,30}$/.test(mediaId)) return { texto: null, motivo: !token ? "falta WHATSAPP_TOKEN" : !clave ? "falta ANTHROPIC_API_KEY" : "id inválido" };
  try {
    const auth = { authorization: `Bearer ${token}` };
    const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: auth, signal: AbortSignal.timeout(10_000) });
    if (!meta.ok) return { texto: null, motivo: `meta ${meta.status}` };
    const { url, mime_type } = (await meta.json()) as { url?: string; mime_type?: string };
    if (!url) return { texto: null, motivo: "sin url" };
    const archivo = await fetch(url, { headers: auth, signal: AbortSignal.timeout(20_000) });
    if (!archivo.ok) return { texto: null, motivo: `descarga ${archivo.status}` };
    const bytes = await archivo.arrayBuffer();
    if (bytes.byteLength > 3_700_000) return { texto: null, motivo: `muy pesada ${bytes.byteLength}` };
    const tipo = /png|webp|gif/.test(mime_type ?? "") ? mime_type! : "image/jpeg";
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
              { type: "image", source: { type: "base64", media_type: tipo, data: Buffer.from(bytes).toString("base64") } },
              {
                type: "text",
                text:
                  "Un cliente le mandó esta foto por WhatsApp a Acopio Saludable (frutos secos, mixes y combos como la «Despensa de 4 kilos»). " +
                  "En UNA línea en español decí qué muestra y qué producto o combo parece querer. Si es la captura de un anuncio, copiá el producto, " +
                  "las cantidades y el precio que se lean. Si es un comprobante de pago, decí «comprobante de pago» con el monto. Sin saludos ni comillas.",
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return { texto: null, motivo: `modelo ${res.status} ${(await res.text()).slice(0, 300)}` };
    const j = (await res.json()) as { content?: { type: string; text?: string }[] };
    const t = (j.content ?? []).map((b) => b.text ?? "").join(" ").replace(/\s+/g, " ").trim();
    return t ? { texto: t.slice(0, 300) } : { texto: null, motivo: "respuesta vacía" };
  } catch (e) {
    return { texto: null, motivo: String(e).slice(0, 200) };
  }
}
