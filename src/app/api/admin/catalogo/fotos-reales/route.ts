// 19/11 (Santiago): «que hagan una gráfica con la foto de cada producto, algo que lo represente, no ese ícono;
// que cada producto tenga la suya, que sea diferente». Busca una foto real de dominio público (Openverse, licencias
// CC0 y dominio público: se pueden usar sin atribución), la recorta cuadrada, la sube al Blob y la deja como foto
// principal del producto. El ajuste del catálogo ya no la pisa (ver catalogo/ajustar).
// POST { items: [{ codigo, q }], aplicar?: boolean, saltear?: number } → por código: url o motivo.
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Hit = { id: string; url: string; thumbnail?: string; width?: number; height?: number; title?: string; license?: string };

async function buscar(q: string, page = 1): Promise<Hit[]> {
  const u = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0,pdm&page_size=20&page=${page}&mature=false`;
  const r = await fetch(u, { headers: { "user-agent": "AcopioSaludable/1.0 (acopiosaludable.com)" }, signal: AbortSignal.timeout(20_000) }).catch(() => null);
  if (!r?.ok) return [];
  const j = (await r.json().catch(() => ({}))) as { results?: Hit[] };
  return (j.results ?? []).filter((h) => (h.width ?? 0) >= 500 && (h.height ?? 0) >= 400);
}

async function bajar(url: string): Promise<Buffer | null> {
  const r = await fetch(url, { headers: { "user-agent": "AcopioSaludable/1.0" }, signal: AbortSignal.timeout(25_000) }).catch(() => null);
  if (!r?.ok) return null;
  const b = Buffer.from(await r.arrayBuffer());
  return b.length > 5000 && b.length < 25 * 1024 * 1024 ? b : null;
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { items?: { codigo: string; q: string; page?: number }[]; aplicar?: boolean };
  const items = (b.items ?? []).slice(0, 25);
  // Fotos ya usadas: cada producto con una distinta.
  const usadas = new Set((await prisma.product.findMany({ where: { fotoUrl: { contains: "openverse-" } }, select: { fotoUrl: true } })).map((p) => (p.fotoUrl ?? "").split("openverse-")[1]?.split("-")[0]));
  const out: Record<string, string> = {};
  for (const it of items) {
    try {
      const hits = await buscar(it.q, it.page ?? 1);
      const hit = hits.find((h) => !usadas.has(h.id.slice(0, 8)));
      if (!hit) { out[it.codigo] = `sin foto para «${it.q}»`; continue; }
      const crudo = (await bajar(hit.url)) ?? (hit.thumbnail ? await bajar(hit.thumbnail) : null);
      if (!crudo) { out[it.codigo] = "no se pudo bajar"; continue; }
      const img = await sharp(crudo).rotate().resize(900, 900, { fit: "cover", position: "attention" }).modulate({ saturation: 1.08 }).webp({ quality: 80 }).toBuffer();
      usadas.add(hit.id.slice(0, 8));
      if (!b.aplicar) { out[it.codigo] = `ok (prueba): ${hit.title ?? ""} ${hit.url}`; continue; }
      const r = await put(`productos/openverse-${hit.id.slice(0, 8)}-${it.codigo.toLowerCase()}.webp`, img, { access: "public", contentType: "image/webp", addRandomSuffix: false, allowOverwrite: true });
      const p = await prisma.product.findUnique({ where: { codigo: it.codigo }, select: { fotos: true } });
      if (!p) { out[it.codigo] = "no existe"; continue; }
      await prisma.product.update({ where: { codigo: it.codigo }, data: { fotoUrl: r.url, fotos: [r.url, ...p.fotos.filter((f) => f !== r.url)].slice(0, 4) } });
      out[it.codigo] = r.url;
    } catch (e) {
      out[it.codigo] = `error: ${String(e).slice(0, 120)}`;
    }
  }
  if (b.aplicar) revalidatePath("/", "layout");
  return NextResponse.json(out);
}
