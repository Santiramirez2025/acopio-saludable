import { NextResponse } from "next/server";
import { estadoAcceso, pedirAcceso } from "@/lib/acceso";

// POST {} → pide acceso (manda el WhatsApp) y devuelve el código. POST {codigo} → cómo va.
export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => ({}))) as { codigo?: string };
  if (cuerpo.codigo) return NextResponse.json({ estado: await estadoAcceso(String(cuerpo.codigo)) });
  const ua = req.headers.get("user-agent") ?? "";
  const lugar = [req.headers.get("x-vercel-ip-city"), req.headers.get("x-vercel-ip-country")].filter(Boolean).map((s) => decodeURIComponent(String(s))).join(", ");
  const equipo = /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /iPhone|Android/.test(ua) ? "celular" : "otro equipo";
  const codigo = await pedirAcceso(`${equipo}${/Chrome/.test(ua) ? " · Chrome" : ""}${lugar ? ` · ${lugar}` : ""}`);
  if (!codigo) return NextResponse.json({ error: "Demasiados pedidos, esperá unos minutos" }, { status: 429 });
  return NextResponse.json({ codigo });
}
