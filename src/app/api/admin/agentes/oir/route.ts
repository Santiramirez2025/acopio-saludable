// Lo que dice Santiago por micrófono → texto. POST multipart { audio } → { texto }. 503 sin OPENAI_API_KEY.
import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/admin-acceso";
import { hayVoz, transcribir } from "@/lib/voz-agentes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ vozNatural: hayVoz() });
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!hayVoz()) return NextResponse.json({ error: "Falta OPENAI_API_KEY" }, { status: 503 });
  const f = await req.formData().catch(() => null);
  const audio = f?.get("audio");
  if (!(audio instanceof Blob) || audio.size < 800) return NextResponse.json({ error: "Audio vacío" }, { status: 400 });
  if (audio.size > 10_000_000) return NextResponse.json({ error: "Audio muy largo" }, { status: 400 });
  try {
    return NextResponse.json({ texto: await transcribir(audio) });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 502 });
  }
}
