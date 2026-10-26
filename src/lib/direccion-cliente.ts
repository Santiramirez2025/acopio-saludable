// La dirección que manda el cliente como captura de Google Maps o como ubicación de WhatsApp: si su
// pedido abierto no tiene dirección, se carga sola (así el reparto tiene el mapa listo).
import { bajarMedia } from "./comprobante";
import { linkMapa } from "./mapa";
import { telefonoFin } from "./telefono";

/** Lee la dirección de una captura (Maps, una foto del frente con el número, un mensaje). null si no hay. */
export async function leerDireccionDeFoto(mediaId: string): Promise<string | null> {
  const clave = process.env.ANTHROPIC_API_KEY;
  const m = clave ? await bajarMedia(mediaId) : null;
  if (!m || m.mime === "application/pdf") return null;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": clave!, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.VENDEDOR_MODELO || "claude-haiku-5-5",
      max_tokens: 120,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: /png|webp|gif/.test(m.mime) ? m.mime : "image/jpeg", data: Buffer.from(m.bytes).toString("base64") } },
            { type: "text", text: 'Si en la imagen se lee una dirección postal (calle y número, barrio, ciudad), respondé SOLO un JSON {"direccion": "Calle 123, Barrio, Ciudad"}. Si no hay dirección, {"direccion": null}.' },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const t = ((await res.json()) as { content?: { text?: string }[] }).content?.map((b) => b.text ?? "").join(" ") ?? "";
  try {
    const d = JSON.parse(t.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as { direccion?: string | null };
    return d.direccion && d.direccion.trim().length > 5 ? d.direccion.trim().slice(0, 160) : null;
  } catch {
    return null;
  }
}

/** «Te mando mi ubicación: Bar X, 9 de Julio 7 (-31.4, -64.5)» → la dirección o las coordenadas. */
export function direccionDeUbicacion(texto: string): string | null {
  const m = texto.match(/^Te mando mi ubicación: (.*?)(?: \((-?\d+\.\d+), (-?\d+\.\d+)\))?$/);
  if (!m) return null;
  const lugar = m[1] && m[1] !== "sin dirección" ? m[1].trim() : "";
  if (lugar && /\d/.test(lugar)) return lugar;
  return m[2] && m[3] ? `${m[2]},${m[3]}` : lugar || null;
}

/** Carga la dirección en el pedido abierto de ese teléfono si le falta. Devuelve el código o null. */
export async function completarDireccion(clave: string, direccion: string): Promise<string | null> {
  const { prisma } = await import("./prisma");
  const { numeroPedido } = await import("./pedido-calculos");
  const fin = telefonoFin(clave);
  const abiertos = (await prisma.order.findMany({ where: { estado: { notIn: ["ENTREGADO", "CANCELADO"] } }, orderBy: { id: "desc" }, take: 40 })).filter((o) => telefonoFin(o.telefono) === fin);
  const o = abiertos.find((x) => !linkMapa(x.calle, x.ciudad, x.provincia));
  if (!o) return null;
  await prisma.$transaction([
    prisma.order.update({ where: { id: o.id }, data: { calle: direccion } }),
    prisma.orderEvent.create({ data: { orderId: o.id, estado: o.estado, nota: `Dirección que mandó el cliente: ${direccion}` } }),
  ]);
  return numeroPedido(o.id);
}
