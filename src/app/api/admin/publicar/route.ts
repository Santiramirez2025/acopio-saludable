// Publica un reel en Instagram (reel + historia) y en la página de Facebook. Solo administrador.
// POST { video: URL pública del .mp4, texto: caption, historia?: boolean, facebook?: boolean }
// POST { imagen: URL pública .jpg/.png } → solo historia de imagen en Instagram (cuando Metricool topa historias).

import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publicarHistoriaImagen, publicarReel } from "@/lib/publicar-reel";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { video?: string; imagen?: string; texto?: string; historia?: boolean; facebook?: boolean };
  if (b.imagen) {
    if (!/^https:\/\/\S+\.(jpe?g|png)(\?\S*)?$/i.test(b.imagen)) return NextResponse.json({ error: "imagen tiene que ser una URL https .jpg o .png" }, { status: 400 });
    return NextResponse.json({ resultados: await publicarHistoriaImagen(b.imagen) });
  }
  if (!b.video || !/^https:\/\//.test(b.video) || !b.texto) return NextResponse.json({ error: "Faltan video (https) y texto" }, { status: 400 });
  const resultados = await publicarReel(b.video, b.texto, { historia: b.historia, facebook: b.facebook });
  return NextResponse.json({ resultados });
}
