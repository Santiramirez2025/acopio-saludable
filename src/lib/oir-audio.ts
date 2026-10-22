// El cliente manda un audio en vez de escribir (María: «nueces para el pan dulce y 2 kilos de mix»).
// Antes se le pedía que lo escribiera y muchos no volvían. Ahora se baja de Meta y se transcribe con
// Whisper (OpenAI, OPENAI_API_KEY): el texto entra a la charla como si lo hubiera escrito.

const GRAPH = "https://graph.facebook.com/v21.0";

export function hayOido(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** Transcribe el audio. null si no se pudo (sin clave, muy largo, falló la API). */
export async function transcribirAudio(mediaId: string): Promise<{ texto: string | null; motivo?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const clave = process.env.OPENAI_API_KEY;
  if (!token || !clave || !/^\d{5,30}$/.test(mediaId)) return { texto: null, motivo: !token ? "falta WHATSAPP_TOKEN" : !clave ? "falta OPENAI_API_KEY" : "id inválido" };
  try {
    const auth = { authorization: `Bearer ${token}` };
    const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: auth, signal: AbortSignal.timeout(10_000) });
    if (!meta.ok) return { texto: null, motivo: `meta ${meta.status}` };
    const { url, mime_type } = (await meta.json()) as { url?: string; mime_type?: string };
    if (!url) return { texto: null, motivo: "sin url" };
    const archivo = await fetch(url, { headers: auth, signal: AbortSignal.timeout(20_000) });
    if (!archivo.ok) return { texto: null, motivo: `descarga ${archivo.status}` };
    const bytes = await archivo.arrayBuffer();
    if (bytes.byteLength > 8_000_000) return { texto: null, motivo: `muy largo ${bytes.byteLength}` };
    const tipo = (mime_type ?? "audio/ogg").split(";")[0];
    const ext = /mp4|m4a/.test(tipo) ? "m4a" : /mpeg|mp3/.test(tipo) ? "mp3" : /wav/.test(tipo) ? "wav" : "ogg";
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: tipo }), `audio.${ext}`);
    form.append("model", "whisper-1");
    form.append("language", "es");
    form.append("prompt", "Pedido por WhatsApp a Acopio Saludable: frutos secos, nueces, almendras, castañas de cajú, mix, dátiles, pasas, semillas, Despensa de 4 kilos, Villa Carlos Paz, Córdoba, kilo, medio kilo.");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { authorization: `Bearer ${clave}` },
      body: form,
      signal: AbortSignal.timeout(40_000),
    });
    if (!res.ok) return { texto: null, motivo: `whisper ${res.status} ${(await res.text()).slice(0, 200)}` };
    const j = (await res.json()) as { text?: string };
    const t = (j.text ?? "").replace(/\s+/g, " ").trim();
    return t ? { texto: t.slice(0, 1500) } : { texto: null, motivo: "vacío" };
  } catch (e) {
    return { texto: null, motivo: String(e).slice(0, 200) };
  }
}
