// Volver a escuchar un audio de WhatsApp (diagnóstico y recuperación cuando la transcripción falló).
// POST { mediaId } → { texto, motivo? }. Solo administrador.
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { transcribirAudio } from "@/lib/oir-audio";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { mediaId?: string };
  return NextResponse.json(await transcribirAudio(String(b.mediaId ?? "")));
}
