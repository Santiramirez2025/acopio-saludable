// Contesta comentarios de Instagram y Facebook: respuesta pública y, si hay intención de compra,
// un mensaje privado (private reply) que abre la charla con el vendedor.

import { prisma } from "@/lib/prisma";
import { paginaMeta } from "@/lib/meta-mensajes";
import { combosTienda } from "@/lib/tienda";
import { pesos } from "@/lib/precios";
import { ignorar, mensajePrivado, respuestaPublica, tieneIntencion, tipoComentario, type Comentario } from "@/lib/comentarios";
import { avisarSantiago } from "@/lib/avisos";
import { leerConfig } from "@/lib/config";
import { precioTransferencia, renglonCombo } from "@/lib/precios";
import { pctTransferenciaCombo } from "@/lib/precio-fijo";

const GRAPH = "https://graph.facebook.com/v21.0";

async function post(camino: string, cuerpo: Record<string, unknown>, token: string, etiqueta: string): Promise<boolean> {
  try {
    const res = await fetch(`${GRAPH}/${camino}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) console.error(`comentarios: ${etiqueta} rechazado`, res.status, (await res.text()).slice(0, 400));
    return res.ok;
  } catch (e) {
    console.error(`comentarios: ${etiqueta} falló`, e);
    return false;
  }
}

/** Marca el comentario como atendido. false si ya lo estaba (Meta reintenta los webhooks). */
async function reservar(c: Comentario, dm: boolean): Promise<boolean> {
  const n = await prisma.$executeRaw`INSERT INTO "ComentarioAtendido" ("id", "canal", "texto", "dm") VALUES (${c.id}, ${c.canal}, ${c.texto.slice(0, 500)}, ${dm}) ON CONFLICT ("id") DO NOTHING`;
  return n > 0;
}

export async function atenderComentarios(lista: Comentario[]): Promise<void> {
  if (!lista.length) return;
  const p = await paginaMeta();
  if (!p) return;
  let oferta: string | null | undefined;
  const ofertaDelDia = async (): Promise<string | null> => {
    if (oferta !== undefined) return oferta;
    const combos = await combosTienda({ activo: true, tipo: "COMBO" }).catch(() => []);
    const trio = combos.find((x) => x.slug === "trio-de-frutos-secos");
    if (!trio) return (oferta = null);
    const cfg = await leerConfig().catch(() => null);
    const antes = cfg ? precioTransferencia(Math.round(trio.precio), pctTransferenciaCombo(trio.slug, cfg.descuentoTransferenciaPct)) : null;
    const trae = trio.items.map((i) => renglonCombo(i.producto, i.cantidad)).join(", ");
    return (oferta = `El Trío son 3 kg (${trae}): ${antes ? `${pesos(antes)} pagando antes por transferencia o ${pesos(Math.round(trio.precio))} al recibir` : pesos(Math.round(trio.precio))}, con envío sin cargo en Carlos Paz.`);
  };
  for (const c of lista) {
    // Lo que comenta la propia cuenta (nuestras respuestas) y las respuestas dentro de un hilo no se contestan.
    if (c.autorId === p.id || c.autorId === p.instagram || c.esRespuesta || ignorar(c.texto)) continue;
    const tipo = tipoComentario(c.texto);
    const dm = (tipo === "compra" || tipo === "donde") && tieneIntencion(c.texto);
    if (!(await reservar(c, dm))) continue;
    // Una queja en público no la contesta un robot: le llega a Santiago para que la responda él.
    if (tipo === "queja") {
      await avisarSantiago("Queja en un comentario", `${c.canal === "instagram" ? "Instagram" : "Facebook"} · ${c.autorNombre ?? "alguien"}: «${c.texto.slice(0, 200)}». Contestala desde la bandeja de Meta (Comentarios).`).catch(() => undefined);
      continue;
    }
    const of = tipo === "compra" || dm ? await ofertaDelDia() : null;
    if (dm) {
      // Private reply: un solo mensaje al autor del comentario, dentro de los 7 días.
      await post(`${p.id}/messages`, { recipient: { comment_id: c.id }, message: { text: mensajePrivado(of) } }, p.token, "mensaje privado");
    }
    const publica = respuestaPublica(c, dm, of);
    if (c.canal === "instagram") await post(`${c.id}/replies`, { message: publica }, p.token, "respuesta en Instagram");
    else await post(`${c.id}/comments`, { message: publica }, p.token, "respuesta en Facebook");
  }
}
