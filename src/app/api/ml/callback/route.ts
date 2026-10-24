// Vuelta del login de Mercado Libre: canjea el código por el token y lo guarda.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canjearCodigo } from "@/lib/mercadolibre";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Falta el código" }, { status: 400 });
  try {
    const t = await canjearCodigo(code);
    return NextResponse.json({ ok: true, mensaje: "Mercado Libre conectado", vendedor: t.user_id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
