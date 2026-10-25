// Llamada de voz en vivo con un agente (como el modo voz de ChatGPT): OpenAI Realtime por WebRTC.
// POST { agente } → { clave, modelo } — clave efímera (dura ~1 min para conectar) con la persona,
// el contexto del negocio, la voz del agente y la herramienta guardar_orden. Solo administrador.
import { NextResponse } from "next/server";
import { esAdminOTv as esAdmin } from "@/lib/admin-acceso";
import { AGENTES, IDS_AGENTES } from "@/lib/agentes";
import { promptAgente } from "@/lib/agentes-chat";
import { VOCES_EN_VIVO } from "@/lib/voz-agentes";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Palabras que el transcriptor tiene que reconocer bien (antes «sin TACC» salía «sin tag»).
const VOCABULARIO = `Acopio Saludable, sin TACC, celíacos, La Granja del Centro, Carlos Paz, Punilla, Córdoba, Mercado Libre, mix, mixes, frutos secos, pan dulce, alfajores, combos, WhatsApp, Meta, Instagram, ${AGENTES.map((a) => a.persona).join(", ")}.`;

const MODELOS = [process.env.OPENAI_REALTIME_MODELO, "gpt-realtime-2.1", "gpt-realtime"].filter(Boolean) as string[];

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const clave = process.env.OPENAI_API_KEY;
  if (!clave) return NextResponse.json({ error: "Falta OPENAI_API_KEY" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { agente?: string };
  const agente = String(b.agente ?? "");
  if (!IDS_AGENTES.includes(agente)) return NextResponse.json({ error: "Agente desconocido" }, { status: 400 });

  const instructions = await promptAgente(agente, "voz");
  let ultimo = "";
  const intentos = [...new Set(MODELOS)].flatMap((model) => [{ model, extras: true }, { model, extras: false }]);
  for (const { model, extras } of intentos) {
    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { authorization: `Bearer ${clave}`, "content-type": "application/json" },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model,
          instructions,
          audio: {
            input: {
              transcription: { model: "gpt-4o-transcribe", language: "es", prompt: VOCABULARIO },
              noise_reduction: { type: "near_field" },
              // Corte de turno rápido: cuando te callás ~0,45 s, contesta; si hablás encima, se calla.
              turn_detection: extras
                ? { type: "server_vad", threshold: 0.5, prefix_padding_ms: 250, silence_duration_ms: 450, create_response: true, interrupt_response: true }
                : { type: "semantic_vad", eagerness: "high" },
            },
            output: extras ? { voice: VOCES_EN_VIVO[agente] ?? "marin", speed: 1.08 } : { voice: VOCES_EN_VIVO[agente] ?? "marin" },
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
    if (r.ok && valor) return NextResponse.json({ clave: valor, modelo: model });
    ultimo = `${r.status} ${d.error?.message ?? ""}`.slice(0, 200);
  }
  return NextResponse.json({ error: `OpenAI no abrió la llamada: ${ultimo}` }, { status: 502 });
}
