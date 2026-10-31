// Token de subida directa a Vercel Blob para archivos grandes (videos ganadores del laboratorio TikTok),
// que no entran por una función (tope de 4,5 MB). El agente sube con @vercel/blob: put(pathname, archivo, { access: "public", token }).
// POST { nombre: "granola-variante-03", tipo?: "video/mp4" } → { token, pathname }. Solo administrador.
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";

export const dynamic = "force-dynamic";

const TIPOS: Record<string, string> = { "video/mp4": "mp4", "image/jpeg": "jpg", "image/png": "png" };

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rw = process.env.BLOB_READ_WRITE_TOKEN;
  if (!rw) return NextResponse.json({ error: "Falta el almacén Blob en Vercel" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { nombre?: string; tipo?: string };
  const tipo = b.tipo && TIPOS[b.tipo] ? b.tipo : "video/mp4";
  const nombre = String(b.nombre ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  if (!nombre) return NextResponse.json({ error: "Falta nombre" }, { status: 400 });
  const dia = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
  const pathname = `videos/${dia}/${nombre}.${TIPOS[tipo]}`;
  const token = await generateClientTokenFromReadWriteToken({
    token: rw, pathname, allowedContentTypes: [tipo], maximumSizeInBytes: 100 * 1024 * 1024, validUntil: Date.now() + 3600e3, addRandomSuffix: true,
  });
  return NextResponse.json({ token, pathname });
}
