// Conexión de Messenger e Instagram, solo para el administrador.
//
// GET  → qué página e Instagram ve el token, y si la página tiene la app suscripta.
// POST → suscribe la app a los webhooks de página e Instagram con nuestra URL, y la página a la app.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { conectarMeta, paginaMeta } from "@/lib/meta-mensajes";
import { urlSitio } from "@/lib/sitio";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!process.env.META_TOKEN) return NextResponse.json({ error: "Falta META_TOKEN" }, { status: 503 });
  const p = await paginaMeta();
  if (!p) return NextResponse.json({ error: "El token no ve la página de Acopio" }, { status: 502 });
  const res = await fetch(`https://graph.facebook.com/v21.0/${p.id}/subscribed_apps`, { headers: { authorization: `Bearer ${p.token}` } });
  return NextResponse.json({ pagina: p.id, instagram: p.instagram, suscripciones: await res.json() });
}

export async function POST() {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await conectarMeta(`${urlSitio()}/api/meta`));
}
