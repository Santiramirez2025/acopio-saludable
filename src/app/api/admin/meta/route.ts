// Conexión de Messenger e Instagram, solo para el administrador.
//
// GET  → qué página e Instagram ve el token, y si la página tiene la app suscripta.
// POST → suscribe la app a los webhooks de página e Instagram con nuestra URL, y la página a la app.

import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { conectarMeta, paginaMeta } from "@/lib/meta-mensajes";
import { urlSitio } from "@/lib/sitio";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!process.env.META_TOKEN) return NextResponse.json({ error: "Falta META_TOKEN" }, { status: 503 });
  const p = await paginaMeta();
  if (!p) return NextResponse.json({ error: "El token no ve la página de Acopio" }, { status: 502 });
  const res = await fetch(`https://graph.facebook.com/v21.0/${p.id}/subscribed_apps`, { headers: { authorization: `Bearer ${p.token}` } });
  // Diagnóstico: qué permisos tiene el token y si puede leer comentarios de Instagram (lo que usan el radar y la respuesta a comentarios).
  const G = "https://graph.facebook.com/v21.0";
  const leer = (u: string, t: string) => fetch(`${G}/${u}`, { headers: { authorization: `Bearer ${t}` } }).then((r) => r.json()).catch((e) => ({ error: String(e) }));
  const permisos = await leer("me/permissions", process.env.META_TOKEN);
  const media = p.instagram ? await leer(`${p.instagram}/media?fields=id,comments_count,timestamp&limit=3`, p.token) : null;
  const primera = (media as { data?: { id: string }[] } | null)?.data?.[0]?.id;
  const comentarios = primera ? await leer(`${primera}/comments?fields=id,text,timestamp&limit=3`, p.token) : null;
  return NextResponse.json({ pagina: p.id, instagram: p.instagram, suscripciones: await res.json(), permisos, media, comentarios });
}

export async function POST() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await conectarMeta(`${urlSitio()}/api/meta`));
}
