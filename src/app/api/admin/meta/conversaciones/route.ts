// Bandeja de Instagram, solo lectura, para Agus (Community) y el panel: no contesta ni marca nada.
//   GET ?horas=24 → conversaciones con actividad en esas horas y sus últimos mensajes, tal como las da Meta.
// Además avisa si la app está suscripta al objeto «instagram»: sin eso, los mensajes no llegan al webhook.
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { paginaMeta } from "@/lib/meta-mensajes";

export const dynamic = "force-dynamic";

const G = "https://graph.facebook.com/v21.0";

async function leer(camino: string, token: string): Promise<{ ok: boolean; cuerpo: Record<string, unknown> }> {
  try {
    const res = await fetch(`${G}/${camino}`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) });
    return { ok: res.ok, cuerpo: (await res.json()) as Record<string, unknown> };
  } catch (e) {
    return { ok: false, cuerpo: { error: String(e) } };
  }
}

type Conversacion = {
  id: string;
  updated_time?: string;
  participants?: { data?: { username?: string; id?: string }[] };
  messages?: { data?: { message?: string; created_time?: string; from?: { username?: string } }[] };
};

export async function GET(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const p = await paginaMeta();
  if (!p) return NextResponse.json({ error: "El token no ve la página de Acopio" }, { status: 502 });
  const horas = Math.min(Math.max(Number(new URL(req.url).searchParams.get("horas")) || 24, 1), 24 * 14);
  const desde = Date.now() - horas * 3_600_000;

  const campos = "updated_time,participants,messages.limit(15){message,created_time,from}";
  const r = await leer(`${p.id}/conversations?platform=instagram&fields=${encodeURIComponent(campos)}&limit=50`, p.token);
  const appId = process.env.WHATSAPP_APP_ID;
  const secreto = process.env.WHATSAPP_APP_SECRET;
  const sus = appId && secreto ? await leer(`${appId}/subscriptions`, `${appId}|${secreto}`) : null;
  const objetos = (sus?.cuerpo.data as { object?: string; active?: boolean; fields?: { name?: string }[] }[] | undefined) ?? [];
  const instagram = objetos.find((o) => o.object === "instagram");

  const lista = (r.cuerpo.data as Conversacion[] | undefined) ?? [];
  return NextResponse.json({
    ok: r.ok,
    error: r.ok ? undefined : r.cuerpo.error,
    horas,
    webhookInstagram: instagram ? { activo: instagram.active ?? null, campos: instagram.fields?.map((f) => f.name) ?? [] } : sus ? "la app no está suscripta al objeto instagram" : "sin datos de la app",
    conversaciones: lista
      .filter((c) => c.updated_time && new Date(c.updated_time).getTime() >= desde)
      .map((c) => ({
        id: c.id,
        actualizada: c.updated_time,
        con: c.participants?.data?.map((x) => x.username).filter(Boolean) ?? [],
        mensajes: (c.messages?.data ?? []).map((m) => ({ de: m.from?.username ?? null, cuando: m.created_time, texto: m.message ?? "" })),
      })),
  });
}
