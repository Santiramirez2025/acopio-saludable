// Prueba y estado de Mercado Libre desde el panel. Solo administrador.
// GET: si está conectado, corre el parte (visitas, ventas, reputación, preguntas) y lo devuelve.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { conectado, parteDiario } from "@/lib/mercadolibre";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = (process.env.ML_CLIENT_ID ?? "").trim();
  const secreto = (process.env.ML_CLIENT_SECRET ?? "").trim();
  const credenciales = { clientId: id ? `${id.slice(0, 4)}…${id.slice(-4)}` : null, largoSecreto: secreto.length };
  if (!(await conectado())) return NextResponse.json({ conectado: false, credenciales });
  try {
    return NextResponse.json({ conectado: true, parte: await parteDiario() });
  } catch (e) {
    return NextResponse.json({ conectado: true, error: String(e) }, { status: 500 });
  }
}
