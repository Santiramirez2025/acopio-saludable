// Sube la portada de un combo armada en el navegador (canvas) y la deja como foto del combo.
// Existe para los combos cuyas fotos de productos están en servidores que el armado de imágenes
// del repo no alcanza: la portada se compone donde las fotos sí cargan.

import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { slug, dataUrl } = (await req.json().catch(() => ({}))) as { slug?: string; dataUrl?: string };
  if (!slug || !/^[a-z0-9-]{3,60}$/.test(slug)) return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  const m = /^data:image\/(webp|jpeg|png);base64,(.+)$/.exec(dataUrl ?? "");
  if (!m) return NextResponse.json({ error: "Imagen inválida" }, { status: 400 });
  const combo = await prisma.combo.findUnique({ where: { slug } });
  if (!combo) return NextResponse.json({ error: "No existe ese combo" }, { status: 404 });
  const datos = Buffer.from(m[2], "base64");
  if (datos.length > 3 * 1024 * 1024) return NextResponse.json({ error: "Muy pesada" }, { status: 400 });
  const ext = m[1] === "jpeg" ? "jpg" : m[1];
  const blob = await put(`combos/${slug}.${ext}`, datos, { access: "public", contentType: `image/${m[1]}`, addRandomSuffix: true });
  await prisma.combo.update({ where: { slug }, data: { fotoUrl: blob.url } });
  return NextResponse.json({ ok: true, url: blob.url });
}
