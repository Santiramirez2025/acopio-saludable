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
const VOCABULARIO = "Charla de trabajo de Acopio Saludable, una dietética de Carlos Paz: productos sin TACC, La Granja del Centro, Mercado Libre.";

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []) => ({ type: "function", name, description, parameters: { type: "object", properties, required } });
const SI = { confirmado: { type: "boolean", description: "true solo si Santiago ya dijo que sí a ESTA acción exacta." } };
// Lo que el agente puede hacer en el momento. Las que cambian algo piden confirmado:true.
const HERRAMIENTAS = [
  fn("ver_pizarra", "La pizarra de armado: cada pedido para armar con lo que lleva (producto, cantidad, presentación), cuánto cobrar, zona y notas, y los totales a juntar. Usala cuando pregunten qué hay que armar.", {}),
  fn("ver_pedidos", "Lista los pedidos abiertos y los de los últimos 7 días (cliente, teléfono, estado, total, pago, ítems).", {}),
  fn("ver_charlas", "Charlas de WhatsApp recientes con sus últimos mensajes y si la ventana de 24 h está abierta.", { horas: { type: "number", description: "Cuántas horas hacia atrás (por defecto 24)." } }),
  fn("ver_charla", "La charla completa con un teléfono.", { telefono: { type: "string" } }, ["telefono"]),
  fn("escribir_whatsapp", "Manda un mensaje de WhatsApp a un cliente o negocio (solo si la ventana de 24 h está abierta).", { telefono: { type: "string" }, texto: { type: "string", description: "Mensaje corto, rioplatense, sin «perfecto»." }, ...SI }, ["telefono", "texto", "confirmado"]),
  fn("cambiar_estado_pedido", "Cambia el estado de un pedido (PAGADO, EN_COMPRA, PREPARADO, ENVIADO le avisa al cliente que su pedido está en el reparto de hoy, ENTREGADO manda gracias + referidos, CANCELADO).", { id: { type: "number" }, estado: { type: "string", enum: ["PENDIENTE_PAGO", "PAGADO", "EN_COMPRA", "PREPARADO", "ENVIADO", "ENTREGADO", "CANCELADO"] }, nota: { type: "string" }, ...SI }, ["id", "estado", "confirmado"]),
  fn("cambiar_precio_ml", "Cambia el precio de una publicación de Mercado Libre (se redondea a $500 y nunca baja del piso de ganancia).", { item: { type: "string", description: "MLA…" }, precio: { type: "number" }, ...SI }, ["item", "precio", "confirmado"]),
  fn("cargar_negocios", "Carga negocios para la captación automática por WhatsApp.", { lista: { type: "array", items: { type: "object", properties: { telefono: { type: "string" }, negocio: { type: "string" }, rubro: { type: "string" }, localidad: { type: "string" } }, required: ["telefono", "negocio"] } }, ...SI }, ["lista", "confirmado"]),
];

const ESFUERZO = (["minimal", "low", "medium", "high"].includes(process.env.OPENAI_REALTIME_ESFUERZO ?? "") ? process.env.OPENAI_REALTIME_ESFUERZO : "low") as string;
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
            output: { voice: VOCES_EN_VIVO[agente] ?? "marin" },
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
