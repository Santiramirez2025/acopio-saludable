// Una orden para un agente, de Santiago (/admin/empresa) o de otro agente (con la clave). El agente la lee en su
// próxima corrida (llega como «PRIORIDAD: <agente> — <rótulo> …» en GET /api/admin/agentes). Solo administrador.
//   POST { agente, texto }
import { esAdminOTv as esAdmin, esSesionAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { guardarOrden } from "@/lib/agentes-chat";
import { IDS_AGENTES } from "@/lib/agentes";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { agente?: string; texto?: string };
  const agente = String(b.agente ?? "");
  const texto = String(b.texto ?? "").trim();
  if (!IDS_AGENTES.includes(agente) || !texto) return NextResponse.json({ error: "Faltan agente y texto" }, { status: 400 });
  // Solo la sesión del panel prueba que es Santiago: la clave de agentes y la TV quedan como orden interna.
  await guardarOrden(agente, texto, (await esSesionAdmin()) ? "santiago" : null);
  return NextResponse.json({ ok: true });
}
