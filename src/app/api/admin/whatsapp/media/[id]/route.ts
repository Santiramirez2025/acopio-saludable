// Audio, foto o archivo que mandó un cliente por WhatsApp, para verlo o escucharlo en el panel.
//
// Meta no da un link público: con el id se pide una URL que dura unos minutos y que también
// exige el token. Por eso pasa por acá, solo para el administrador.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const GRAPH = "https://graph.facebook.com/v21.0";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getServerSession(authOptions))) return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  const token = process.env.WHATSAPP_TOKEN;
  if (!token || !/^\d{5,30}$/.test(id)) return new Response("No encontrado", { status: 404 });
  const auth = { authorization: `Bearer ${token}` };
  const meta = await fetch(`${GRAPH}/${id}`, { headers: auth, signal: AbortSignal.timeout(10_000) });
  if (!meta.ok) return new Response("Ya no está disponible", { status: 404 });
  const { url, mime_type } = (await meta.json()) as { url?: string; mime_type?: string };
  if (!url) return new Response("Ya no está disponible", { status: 404 });
  const archivo = await fetch(url, { headers: auth, signal: AbortSignal.timeout(20_000) });
  if (!archivo.ok || !archivo.body) return new Response("Ya no está disponible", { status: 404 });
  return new Response(archivo.body, {
    headers: { "content-type": mime_type ?? archivo.headers.get("content-type") ?? "application/octet-stream", "cache-control": "private, max-age=86400" },
  });
}
