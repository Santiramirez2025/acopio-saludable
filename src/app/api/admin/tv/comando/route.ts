// Santiago elige desde el celular qué se ve en la TV.  POST { vista: "oficina" | "armado" | "agente", agente? }
import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/admin-acceso";
import { IDS_AGENTES } from "@/lib/agentes";
import { mandarComando } from "@/lib/tv";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { vista?: string; agente?: string };
  const vista = b.vista === "armado" ? "armado" : b.vista === "agente" && b.agente && IDS_AGENTES.includes(b.agente) ? "agente" : "oficina";
  return NextResponse.json({ ok: true, comando: await mandarComando({ vista, agente: vista === "agente" ? b.agente : undefined }) });
}
