// Santiago aprueba desde el panel el código que muestra la TV. Solo administrador.
//   POST { codigo }
import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/admin-acceso";
import { vincularCodigo } from "@/lib/tv";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { codigo?: string };
  const ok = await vincularCodigo(String(b.codigo ?? ""));
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Ese código no existe o ya venció. Recargá la TV para ver uno nuevo." }, { status: 404 });
}
