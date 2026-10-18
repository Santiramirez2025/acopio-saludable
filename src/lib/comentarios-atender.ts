// Contesta comentarios de Instagram y Facebook: respuesta pública y, si hay intención de compra,
// un mensaje privado (private reply) que abre la charla con el vendedor.

import { prisma } from "@/lib/prisma";
import { paginaMeta } from "@/lib/meta-mensajes";
import { combosTienda } from "@/lib/tienda";
import { pesos } from "@/lib/precios";
import { ignorar, mensajePrivado, respuestaPublica, tieneIntencion, type Comentario } from "@/lib/comentarios";

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
  let precio: string | null = null;
  for (const c of lista) {
    // Lo que comenta la propia cuenta (nuestras respuestas) y las respuestas dentro de un hilo no se contestan.
    if (c.autorId === p.id || c.autorId === p.instagram || c.esRespuesta || ignorar(c.texto)) continue;
    const dm = tieneIntencion(c.texto);
    if (!(await reservar(c, dm))) continue;
    if (dm) {
      if (precio === null) {
        const despensa = (await combosTienda({ activo: true, tipo: "COMBO" }).catch(() => [])).find((x) => x.slug === "despensa-4-kilos");
        precio = despensa ? pesos(Math.round(despensa.precio)) : "";
      }
      // Private reply: un solo mensaje al autor del comentario, dentro de los 7 días.
      await post(`${p.id}/messages`, { recipient: { comment_id: c.id }, message: { text: mensajePrivado(precio || null) } }, p.token, "mensaje privado");
    }
    const publica = respuestaPublica(c, dm);
    if (c.canal === "instagram") await post(`${c.id}/replies`, { message: publica }, p.token, "respuesta en Instagram");
    else await post(`${c.id}/comments`, { message: publica }, p.token, "respuesta en Facebook");
  }
}
