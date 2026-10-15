// Perfil de WhatsApp Business del número de la tienda: foto, descripción corta, web y rubro.
//
// Existe porque el panel de Meta solo deja subir la foto con el selector de archivos del
// sistema, y así el perfil queda en código: si se cambia el número o se pierde la foto,
// se vuelve a dejar igual con un POST.
//
// La foto se sube en dos pasos, como pide Meta: primero a la app (subida reanudable, que
// devuelve un "handle") y después ese handle se asigna al perfil del número.
//
// GET  → el perfil como está hoy en Meta.
// POST → sube la foto y deja los textos. Idempotente.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { urlSitio } from "@/lib/sitio";

export const dynamic = "force-dynamic";

const GRAPH = "https://graph.facebook.com/v21.0";
const CAMPOS = "about,address,description,email,profile_picture_url,websites,vertical";

// Lo que ve el cliente al tocar el nombre. "about" admite 139 caracteres.
const PERFIL = {
  about: "Productos saludables a granel y sin TACC · Villa Carlos Paz",
  description:
    "Tienda online de productos saludables a granel y sin TACC. Entrega sin cargo en Villa Carlos Paz y sur de Punilla, envíos a todo el país. Compra mínima $35.000. Atendemos de lunes a sábado de 8 a 20.",
  address: "Villa Carlos Paz, Córdoba",
  websites: ["https://www.acopiosaludable.com"],
  vertical: "GROCERY",
};

async function graph(camino: string, init: RequestInit = {}): Promise<{ ok: boolean; estado: number; cuerpo: unknown }> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) return { ok: false, estado: 0, cuerpo: "Falta WHATSAPP_TOKEN" };
  const res = await fetch(`${GRAPH}/${camino}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  const texto = await res.text();
  let cuerpo: unknown = texto;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    /* texto plano */
  }
  return { ok: res.ok, estado: res.status, cuerpo };
}

async function autorizado() {
  return Boolean(await getServerSession(authOptions));
}

export async function GET() {
  if (!(await autorizado())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const telefono = process.env.WHATSAPP_PHONE_ID;
  if (!telefono) return NextResponse.json({ error: "Falta WHATSAPP_PHONE_ID" }, { status: 503 });
  return NextResponse.json(await graph(`${telefono}/whatsapp_business_profile?fields=${CAMPOS}`));
}

export async function POST() {
  if (!(await autorizado())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const telefono = process.env.WHATSAPP_PHONE_ID;
  const app = process.env.WHATSAPP_APP_ID;
  if (!telefono || !app) return NextResponse.json({ error: "Faltan WHATSAPP_PHONE_ID o WHATSAPP_APP_ID" }, { status: 503 });

  // 1) La imagen sale del propio sitio: así es la misma que se ve en la web.
  const img = await fetch(`${urlSitio()}/marca/acopio-perfil-whatsapp.png`, { signal: AbortSignal.timeout(15_000) });
  if (!img.ok) return NextResponse.json({ error: `No se pudo leer la imagen (${img.status})` }, { status: 502 });
  const bytes = Buffer.from(await img.arrayBuffer());

  // 2) Sesión de subida en la app.
  const sesion = await graph(`${app}/uploads?file_name=acopio-perfil.png&file_length=${bytes.length}&file_type=image/png`, { method: "POST" });
  const idSesion = (sesion.cuerpo as { id?: string })?.id;
  if (!sesion.ok || !idSesion) return NextResponse.json({ paso: "sesion", ...sesion }, { status: 502 });

  // 3) Los bytes. La subida reanudable usa "OAuth" en vez de "Bearer".
  const subida = await fetch(`${GRAPH}/${idSesion}`, {
    method: "POST",
    headers: { authorization: `OAuth ${process.env.WHATSAPP_TOKEN}`, file_offset: "0" },
    body: bytes,
    signal: AbortSignal.timeout(30_000),
  });
  const subidaCuerpo = (await subida.json().catch(() => ({}))) as { h?: string };
  if (!subida.ok || !subidaCuerpo.h) return NextResponse.json({ paso: "subida", estado: subida.status, cuerpo: subidaCuerpo }, { status: 502 });

  // 4) Foto y textos al perfil del número.
  const perfil = await graph(`${telefono}/whatsapp_business_profile`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", profile_picture_handle: subidaCuerpo.h, ...PERFIL }),
  });
  const ahora = await graph(`${telefono}/whatsapp_business_profile?fields=${CAMPOS}`);
  return NextResponse.json({ perfil, ahora }, { status: perfil.ok ? 200 : 502 });
}
