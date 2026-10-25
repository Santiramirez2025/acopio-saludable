// Voz natural para hablar con los agentes de la oficina (OpenAI, OPENAI_API_KEY):
// - hablar(): texto → audio mp3 con una voz por agente (gpt-4o-mini-tts; si falla, tts-1).
// - transcribir(): lo que dice Santiago por micrófono → texto (gpt-4o-transcribe; si falla, whisper-1).
// Sin clave, las rutas devuelven 503 y la oficina usa la voz del navegador.

const API = "https://api.openai.com/v1";

/** Voz de cada persona del equipo (mujeres y hombres distintos, que se reconozcan). */
export const VOCES: Record<string, string> = {
  gerente: "coral", estratega: "ash", ventas: "verse", hunter: "nova", fidelizacion: "shimmer", mercadolibre: "echo",
  anuncios: "sage", marketing: "nova", disenador: "ballad", community: "verse", seo: "echo", alianzas: "shimmer",
  reels: "ash", compras: "onyx", logistica: "onyx", finanzas: "sage", web: "ballad", corporativo: "coral", sociedades: "ash",
};

/** Voces de la llamada en vivo (Realtime): marin y cedar son las más naturales. */
export const VOCES_EN_VIVO: Record<string, string> = {
  gerente: "marin", estratega: "cedar", corporativo: "coral", sociedades: "ash", ventas: "cedar", hunter: "shimmer",
  fidelizacion: "marin", mercadolibre: "echo", web: "verse", anuncios: "sage", marketing: "coral", disenador: "ballad",
  community: "verse", reels: "ash", seo: "echo", alianzas: "shimmer", compras: "cedar", logistica: "ash", finanzas: "sage",
};

const INSTRUCCIONES =
  "Hablás en español rioplatense de Argentina (Córdoba), como una persona real de un equipo de trabajo: cálida, segura, natural, con ritmo de conversación y sin sonar a locutor. Pronunciá bien los números y los precios en pesos.";

export function hayVoz(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function hablar(texto: string, agente: string): Promise<Response> {
  const clave = process.env.OPENAI_API_KEY!;
  const voz = VOCES[agente] ?? "alloy";
  const limpio = texto.replace(/[*_#`>]/g, "").replace(/\n{2,}/g, "\n").slice(0, 3500);
  const pedir = (cuerpo: Record<string, unknown>) =>
    fetch(`${API}/audio/speech`, {
      method: "POST",
      headers: { authorization: `Bearer ${clave}`, "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(45_000),
    });
  let r = await pedir({ model: process.env.OPENAI_TTS_MODELO || "gpt-4o-mini-tts", voice: voz, input: limpio, instructions: INSTRUCCIONES, response_format: "mp3" });
  if (!r.ok) r = await pedir({ model: "tts-1", voice: ["coral", "verse", "ballad", "sage", "ash"].includes(voz) ? "alloy" : voz, input: limpio, response_format: "mp3" });
  return r;
}

export async function transcribir(audio: Blob): Promise<string> {
  const clave = process.env.OPENAI_API_KEY!;
  const pedir = async (modelo: string) => {
    const f = new FormData();
    f.append("file", audio, audio.type.includes("mp4") ? "voz.m4a" : "voz.webm");
    f.append("model", modelo);
    f.append("language", "es");
    f.append("prompt", "Santiago le habla a un agente de su empresa Acopio Saludable (frutos secos, Villa Carlos Paz): ventas, pedidos, clientes, Mercado Libre, Instagram, combos, La Granja.");
    return fetch(`${API}/audio/transcriptions`, { method: "POST", headers: { authorization: `Bearer ${clave}` }, body: f, signal: AbortSignal.timeout(40_000) });
  };
  let r = await pedir(process.env.OPENAI_STT_MODELO || "gpt-4o-transcribe");
  if (!r.ok) r = await pedir("whisper-1");
  if (!r.ok) throw new Error(`No pude entender el audio (${r.status})`);
  const j = (await r.json()) as { text?: string };
  return (j.text ?? "").replace(/\s+/g, " ").trim();
}
