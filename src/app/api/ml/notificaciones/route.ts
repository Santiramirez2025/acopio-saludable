// Notificaciones de Mercado Libre (questions, orders_v2). ML espera un 200 rápido; lo demás se hace igual
// dentro del tiempo de la función. Si algo se pierde, el barrido diario lo levanta.
import { NextResponse } from "next/server";
import { avisarVenta, conectado, responderPregunta } from "@/lib/mercadolibre";
import { conRegistro } from "@/lib/salud";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const n = (await req.json().catch(() => ({}))) as { topic?: string; resource?: string; user_id?: number };
  if (!n.resource || !(await conectado())) return NextResponse.json({ ok: true });
  try {
    if (n.topic === "questions") {
      const id = n.resource.split("/").pop() ?? "";
      await conRegistro("ml-pregunta", () => responderPregunta(id), (r) => `${id}: ${r}`);
    } else if (n.topic === "orders_v2" || n.topic === "orders") {
      await avisarVenta(n.resource);
    }
  } catch (e) {
    console.error("ml notificación", n.topic, e);
  }
  return NextResponse.json({ ok: true });
}
