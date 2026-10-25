// Diagnóstico y arreglo de la conexión con WhatsApp Cloud API, solo para el administrador.
//
// Existe por un síntoma concreto: Meta muestra el webhook en su panel de pruebas pero nunca
// llama a nuestra URL. Pasa cuando la cuenta de WhatsApp Business (WABA) no está suscripta
// a la app. La suscripción se hace con una llamada a la Graph API que necesita el token,
// y el token vive en el servidor: por eso esto es una ruta y no un comando.
//
// GET  → qué apps están suscriptas a la WABA y el estado del número.
// POST → suscribe esta app a la WABA. Es idempotente: repetirla no rompe nada.

import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const GRAPH = "https://graph.facebook.com/v21.0";

async function graph(camino: string, metodo: "GET" | "POST"): Promise<{ ok: boolean; estado: number; cuerpo: unknown }> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) return { ok: false, estado: 0, cuerpo: "Falta WHATSAPP_TOKEN" };
  try {
    const res = await fetch(`${GRAPH}/${camino}`, { method: metodo, headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
    const texto = await res.text();
    let cuerpo: unknown = texto;
    try {
      cuerpo = JSON.parse(texto);
    } catch {
      /* Meta a veces contesta texto plano */
    }
    return { ok: res.ok, estado: res.status, cuerpo };
  } catch (e) {
    return { ok: false, estado: 0, cuerpo: String(e) };
  }
}

function faltantes(): string[] {
  return ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID", "WHATSAPP_WABA_ID", "WHATSAPP_APP_SECRET", "WHATSAPP_VERIFY_TOKEN"].filter((k) => !process.env[k]);
}

export async function GET() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const waba = process.env.WHATSAPP_WABA_ID;
  const telefono = process.env.WHATSAPP_PHONE_ID;
  const [suscripciones, numero] = await Promise.all([
    waba ? graph(`${waba}/subscribed_apps`, "GET") : null,
    telefono ? graph(`${telefono}?fields=display_phone_number,verified_name,quality_rating,platform_type`, "GET") : null,
  ]);
  return NextResponse.json({ faltantes: faltantes(), suscripciones, numero });
}

export async function POST() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!waba) return NextResponse.json({ error: "Falta WHATSAPP_WABA_ID" }, { status: 503 });
  const r = await graph(`${waba}/subscribed_apps`, "POST");
  const despues = await graph(`${waba}/subscribed_apps`, "GET");
  return NextResponse.json({ suscripcion: r, ahora: despues });
}
