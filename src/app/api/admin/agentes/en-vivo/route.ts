// Llamada de voz en vivo con un agente (como el modo voz de ChatGPT): OpenAI Realtime por WebRTC.
// POST { agente } → { clave, modelo } — clave efímera (dura ~1 min para conectar) con la persona,
// el contexto del negocio, la voz del agente y la herramienta guardar_orden. Solo administrador.
import { NextResponse } from "next/server";
import { esAdminOTv as esAdmin } from "@/lib/admin-acceso";
import { AGENTES, IDS_AGENTES } from "@/lib/agentes";
import { promptAgente } from "@/lib/agentes-chat";
import { VELOCIDAD_VOZ, VOCES_EN_VIVO } from "@/lib/voz-agentes";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Palabras que el transcriptor tiene que reconocer bien (antes «sin TACC» salía «sin tag»).
const VOCABULARIO = "Charla de trabajo de Acopio Saludable, una dietética de Carlos Paz: productos sin TACC, La Granja del Centro, Mercado Libre.";

import { HERRAMIENTAS } from "@/lib/herramientas-agentes";

const ESFUERZO = (["minimal", "low", "medium", "high"].includes(process.env.OPENAI_REALTIME_ESFUERZO ?? "") ? process.env.OPENAI_REALTIME_ESFUERZO : "minimal") as string; // minimal: arranca a hablar enseguida (la fluidez vale más que pensar de más)

// Mini primero: misma fluidez y mismas voces, un tercio del costo por minuto ($10/$20 por millón de tokens de audio
// contra $32/$64 del 2.1). Con OPENAI_REALTIME_MODELO se fuerza otro (por ejemplo gpt-realtime-2.1 para grabar una demo).
const MODELOS = [process.env.OPENAI_REALTIME_MODELO, "gpt-realtime-2.1-mini", "gpt-realtime-mini", "gpt-realtime-2.1", "gpt-realtime"].filter(Boolean) as string[];

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const clave = process.env.OPENAI_API_KEY;
  if (!clave) return NextResponse.json({ error: "Falta OPENAI_API_KEY" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { agente?: string };
  const agente = String(b.agente ?? "");
  if (!IDS_AGENTES.includes(agente)) return NextResponse.json({ error: "Agente desconocido" }, { status: 400 });

  const instructions = await promptAgente(agente, "voz");
  let ultimo = "";
  // Del mejor al más simple: si OpenAI rechaza algo (modelo o parámetro nuevo), probamos el siguiente.
  const intentos = [...new Set(MODELOS)].flatMap((model) => [
    { model, nivel: 2 },
    { model, nivel: 1 },
    { model, nivel: 0 },
  ]);
  for (const { model, nivel } of intentos) {
    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { authorization: `Bearer ${clave}`, "content-type": "application/json" },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model,
          instructions,
          // Que piense un poco antes de contestar (respuestas mejores sin perder fluidez).
          ...(nivel >= 2 ? { reasoning: { effort: ESFUERZO } } : {}),
          audio: {
            input: {
              transcription: { model: nivel >= 1 ? "gpt-live-transcribe" : "gpt-4o-transcribe", language: "es", prompt: VOCABULARIO },
              noise_reduction: { type: "near_field" },
              // Que no te pise: entiende por el sentido de la frase si terminaste (no solo por el silencio)
              // y con «low» te espera un poco más. Si hablás encima, se calla.
              turn_detection: nivel >= 1
                ? { type: "semantic_vad", eagerness: "low", create_response: true, interrupt_response: true }
                : { type: "server_vad", threshold: 0.55, prefix_padding_ms: 300, silence_duration_ms: 1000, create_response: true, interrupt_response: true },
            },
            output: { voice: VOCES_EN_VIVO[agente] ?? "marin", ...(nivel >= 1 ? { speed: VELOCIDAD_VOZ[agente] ?? 1 } : {}) },
          },
          tools: [
            {
              type: "function",
              name: "guardar_orden",
              description: "Guarda una orden de Santiago para la próxima corrida del agente que corresponda. Usala solo cuando Santiago pide que se haga algo. Si la tarea es de otra persona del equipo, mandásela directo a ella con «para».",
              parameters: {
                type: "object",
                properties: {
                  orden: { type: "string", description: "La instrucción clara y completa, en una o dos oraciones." },
                  para: { type: "string", enum: IDS_AGENTES, description: `Quién la hace (por defecto, vos). Equipo: ${AGENTES.map((a) => `${a.id}=${a.persona} (${a.nombre})`).join("; ")}.` },
                },
                required: ["orden"],
              },
            },
            ...HERRAMIENTAS,
          ],
          tool_choice: "auto",
        },
      }),
      signal: AbortSignal.timeout(15_000),
    }).catch((e: unknown) => {
      ultimo = String(e);
      return null;
    });
    if (!r) continue;
    const d = (await r.json().catch(() => ({}))) as { value?: string; client_secret?: { value?: string }; error?: { message?: string } };
    const valor = d.value ?? d.client_secret?.value;
    if (r.ok && valor) return NextResponse.json({ clave: valor, modelo: model, nivel });
    ultimo = `${r.status} ${d.error?.message ?? ""}`.slice(0, 200);
  }
  return NextResponse.json({ error: `OpenAI no abrió la llamada: ${ultimo}` }, { status: 502 });
}
