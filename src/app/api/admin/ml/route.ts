// Prueba y estado de Mercado Libre desde el panel. Solo administrador.
// GET: si está conectado, corre el parte (visitas, ventas, reputación, preguntas) y lo devuelve.
// POST { accion: "precio", item: "MLA…", precio } → cambia el precio (nunca bajo el piso de ganancia).
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cambiarPrecioMl, conectado, parteDiario } from "@/lib/mercadolibre";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = (process.env.ML_CLIENT_ID ?? "").trim();
  const secreto = (process.env.ML_CLIENT_SECRET ?? "").trim();
  const credenciales = { clientId: id ? `${id.slice(0, 4)}…${id.slice(-4)}` : null, largoSecreto: secreto.length, huellaSecreto: secreto ? createHash("sha256").update(secreto).digest("hex").slice(0, 8) : null, entorno: process.env.VERCEL_ENV ?? null, desplegado: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null };
  // Prueba directa de las credenciales (client_credentials): dice si ML acepta el par id/clave.
  const prueba = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secreto }),
  }).then(async (r) => (r.ok ? "aceptadas" : `rechazadas (${r.status}: ${(await r.text()).slice(0, 120)})`)).catch((e) => `sin respuesta: ${e}`);
  if (!(await conectado())) return NextResponse.json({ conectado: false, credenciales, prueba });
  try {
    return NextResponse.json({ conectado: true, parte: await parteDiario() });
  } catch (e) {
    return NextResponse.json({ conectado: true, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { accion?: string; item?: string; precio?: number };
  if (b.accion !== "precio" || !b.item || !Number(b.precio)) return NextResponse.json({ error: "POST { accion: \"precio\", item, precio }" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await cambiarPrecioMl(String(b.item), Number(b.precio))) });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 400 });
  }
}
