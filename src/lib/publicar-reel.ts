// Publicar el reel del día en todos lados con un solo pedido: Instagram (reel en el feed + historia)
// y Facebook (reel de la página). El video tiene que estar en una URL pública (lo subimos a
// /video/reels/ del sitio). Usa la página y el token de meta-mensajes (META_TOKEN).
//
// Instagram necesita instagram_content_publish (lo tiene). Facebook necesita pages_manage_posts:
// si el token no lo tiene, devuelve el error de Meta y lo demás se publica igual.

import { paginaMeta } from "./meta-mensajes";

const GRAPH = "https://graph.facebook.com/v21.0";
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Resultado = { donde: string; ok: boolean; id?: string; error?: string };

async function graph(camino: string, token: string, params: Record<string, string>, metodo: "GET" | "POST" = "POST") {
  const q = new URLSearchParams(params);
  const url = metodo === "GET" ? `${GRAPH}/${camino}?${q}` : `${GRAPH}/${camino}`;
  const res = await fetch(url, {
    method: metodo,
    headers: { authorization: `Bearer ${token}`, ...(metodo === "POST" ? { "content-type": "application/x-www-form-urlencoded" } : {}) },
    body: metodo === "POST" ? q : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const j = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: { message?: string } };
  if (!res.ok || j.error) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
  return j;
}

/** Crea el contenedor en Instagram, espera que Meta procese el video y lo publica. */
async function instagram(ig: string, token: string, params: Record<string, string>, donde: string): Promise<Resultado> {
  try {
    const c = await graph(`${ig}/media`, token, params);
    const id = String(c.id);
    for (let i = 0; i < 40; i++) {
      await dormir(5000);
      const s = await graph(id, token, { fields: "status_code,status" }, "GET");
      if (s.status_code === "FINISHED") break;
      if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`Meta no pudo procesar el archivo: ${String(s.status ?? s.status_code)}`);
      if (i === 39) throw new Error("Meta tardó demasiado en procesar el video");
    }
    const p = await graph(`${ig}/media_publish`, token, { creation_id: id });
    return { donde, ok: true, id: String(p.id) };
  } catch (e) {
    return { donde, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Reel en la página de Facebook (subida por URL). */
async function facebook(pagina: string, token: string, video: string, texto: string): Promise<Resultado> {
  const donde = "Facebook reel";
  try {
    const inicio = await graph(`${pagina}/video_reels`, token, { upload_phase: "start" });
    const videoId = String(inicio.video_id);
    const sub = await fetch(`https://rupload.facebook.com/video-upload/v21.0/${videoId}`, {
      method: "POST",
      headers: { authorization: `OAuth ${token}`, file_url: video },
      signal: AbortSignal.timeout(60_000),
    });
    if (!sub.ok) throw new Error(`subida ${sub.status} ${(await sub.text()).slice(0, 200)}`);
    await graph(`${pagina}/video_reels`, token, { upload_phase: "finish", video_id: videoId, video_state: "PUBLISHED", description: texto });
    return { donde, ok: true, id: videoId };
  } catch (e) {
    return { donde, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Historia de imagen (JPG/PNG público) en Instagram. Sirve cuando Metricool llega a su tope de historias. */
export async function publicarHistoriaImagen(imagen: string): Promise<Resultado[]> {
  const p = await paginaMeta();
  if (!p) return [{ donde: "Meta", ok: false, error: "El token no ve la página de Acopio" }];
  if (!p.instagram) return [{ donde: "Instagram", ok: false, error: "La página no tiene Instagram conectado" }];
  return [await instagram(p.instagram, p.token, { media_type: "STORIES", image_url: imagen }, "Instagram historia (imagen)")];
}

export async function publicarReel(video: string, texto: string, opciones: { historia?: boolean; facebook?: boolean } = {}): Promise<Resultado[]> {
  const p = await paginaMeta();
  if (!p) return [{ donde: "Meta", ok: false, error: "El token no ve la página de Acopio" }];
  const salida: Resultado[] = [];
  if (p.instagram) {
    salida.push(await instagram(p.instagram, p.token, { media_type: "REELS", video_url: video, caption: texto, share_to_feed: "true" }, "Instagram reel"));
    if (opciones.historia !== false) salida.push(await instagram(p.instagram, p.token, { media_type: "STORIES", video_url: video }, "Instagram historia"));
  } else salida.push({ donde: "Instagram", ok: false, error: "La página no tiene Instagram conectado" });
  if (opciones.facebook !== false) salida.push(await facebook(p.id, p.token, video, texto));
  return salida;
}
