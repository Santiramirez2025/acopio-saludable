// Conecta la cuenta de Mercado Libre (una sola vez). Solo administrador.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { urlAutorizar } from "@/lib/mercadolibre";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const url = urlAutorizar();
  if (!url) return NextResponse.json({ error: "Falta ML_CLIENT_ID en Vercel" }, { status: 400 });
  return NextResponse.redirect(url);
}
