// Llamada de voz en vivo con un agente (como el modo voz de ChatGPT): OpenAI Realtime por WebRTC.
// POST { agente } → { clave, modelo } — clave efímera (dura ~1 min para conectar) con la persona,
// el contexto del negocio, la voz del agente y la herramienta guardar_orden. Solo administrador.
import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/admin-acceso";
import { IDS_AGENTES } from "@/lib/agentes";
import { promptAgente } from "@/lib/agentes-chat";
import { VOCES_EN_VIVO } from "@/lib/voz-agentes";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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
  for (const model of [...new Set(MODELOS)]) {
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
              transcription: { model: "gpt-4o-mini-transcribe", language: "es" },
              noise_reduction: { type: "near_field" },
              turn_detection: { type: "semantic_vad", eagerness: "high" },
            },
            output: { voice: VOCES_EN_VIVO[agente] ?? "marin" },
          },
          tools: [
            {
              type: "function",
              name: "guardar_orden",
              description: "Guarda una orden de Santiago para que este agente la haga en su próxima corrida. Usala solo cuando Santiago pide que hagas algo.",
              parameters: {
                type: "object",
                properties: { orden: { type: "string", description: "La instrucción clara y completa, en una o dos oraciones." } },
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
