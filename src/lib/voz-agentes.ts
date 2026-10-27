// Voz natural para hablar con los agentes de la oficina (OpenAI, OPENAI_API_KEY):
// - hablar(): texto → audio mp3 con una voz por agente (gpt-4o-mini-tts; si falla, tts-1).
// - transcribir(): lo que dice Santiago por micrófono → texto (gpt-4o-transcribe; si falla, whisper-1).
// Sin clave, las rutas devuelven 503 y la oficina usa la voz del navegador.

const API = "https://api.openai.com/v1";

/** Voz de cada persona del equipo (mujeres y hombres distintos, que se reconozcan). */
export const VOCES: Record<string, string> = {
  gerente: "marin", corporativo: "marin", hunter: "marin", fidelizacion: "marin", anuncios: "marin", marketing: "marin", alianzas: "marin", finanzas: "marin",
  estratega: "cedar", sociedades: "cedar", ventas: "cedar", mercadolibre: "cedar", web: "cedar", disenador: "cedar", community: "cedar", reels: "cedar", seo: "cedar", compras: "cedar", logistica: "cedar", seguridad: "onyx", financiamiento: "onyx", mayorista: "onyx", marketplaces: "nova",
};

/**
 * Voces de la llamada en vivo (Realtime). Las 10 voces del modelo repartidas para que cada persona del
 * equipo suene distinta: las que comparten voz se separan por velocidad y por carácter (voz-estilo.ts).
 * Mujeres: marin, coral, sage, shimmer, alloy. Hombres: cedar, ash, echo, verse, ballad.
 */
export const VOCES_EN_VIVO: Record<string, string> = {
  gerente: "marin", corporativo: "sage", hunter: "coral", fidelizacion: "shimmer", anuncios: "alloy", marketing: "coral", alianzas: "shimmer", finanzas: "sage",
  estratega: "cedar", sociedades: "ash", ventas: "echo", mercadolibre: "verse", web: "ballad", disenador: "ash", community: "echo", reels: "verse", seo: "ballad", compras: "cedar", logistica: "cedar", seguridad: "ash", financiamiento: "verse", mayorista: "cedar", marketplaces: "coral",
};

/** Velocidad del habla por persona (0.25 a 1.5): separa a los que comparten voz y acompaña el carácter. */
export const VELOCIDAD_VOZ: Record<string, number> = {
  gerente: 1.1, corporativo: 1.07, hunter: 1.2, fidelizacion: 1.08, anuncios: 1.14, marketing: 1.18, alianzas: 1.22, finanzas: 1.05,
  estratega: 1.2, sociedades: 1.13, ventas: 1.18, mercadolibre: 1.15, web: 1.07, disenador: 1.05, community: 1.22, reels: 1.2, seo: 1.04, compras: 1.06, logistica: 1.12, seguridad: 1.0, financiamiento: 1.05, mayorista: 1.15, marketplaces: 1.2,
};

const INSTRUCCIONES =
  "Hablás en español rioplatense de Argentina, como una persona real del equipo: voz clara, cálida y agradable, ritmo tranquilo, vocalizando bien cada palabra, con pausas naturales entre frases. Nada de tono de locutor ni de apuro. Números y precios dichos claros y redondeados.";

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
  if (!r.ok) r = await pedir({ model: "tts-1", voice: ["coral", "verse", "ballad", "sage", "ash", "marin", "cedar"].includes(voz) ? (["marin", "coral", "sage", "shimmer"].includes(voz) ? "nova" : "onyx") : voz, input: limpio, response_format: "mp3" });
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
