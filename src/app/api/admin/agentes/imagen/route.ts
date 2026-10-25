// El Diseñador sube acá las piezas que genera (PNG/JPG/WebP en base64) y recibe una URL pública
// para publicar en redes o usar en anuncios. Solo administrador.
// POST { nombre: "navidad-kit-pan-dulce", datos: "<base64>", tipo?: "image/png" } → { url }
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TIPOS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export async function POST(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Falta el almacén Blob en Vercel" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { nombre?: string; datos?: string; tipo?: string };
  const tipo = b.tipo && TIPOS[b.tipo] ? b.tipo : "image/png";
  const nombre = String(b.nombre ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const datos = String(b.datos ?? "").replace(/^data:[^,]+,/, "");
  if (!nombre || !datos) return NextResponse.json({ error: "Faltan nombre y datos" }, { status: 400 });
  const buf = Buffer.from(datos, "base64");
  if (buf.length < 1000 || buf.length > 8 * 1024 * 1024) return NextResponse.json({ error: "La imagen tiene que pesar entre 1 KB y 8 MB" }, { status: 400 });
  const dia = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
  const r = await put(`diseno/${dia}/${nombre}.${TIPOS[tipo]}`, buf, { access: "public", contentType: tipo, addRandomSuffix: true });
  return NextResponse.json({ url: r.url });
}
