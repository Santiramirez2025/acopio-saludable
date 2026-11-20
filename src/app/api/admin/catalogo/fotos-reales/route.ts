// 19/11 (Santiago): «que hagan una gráfica con la foto de cada producto, algo que lo represente, no ese ícono».
// Fotos reales de Openverse (licencias libres: CC0, dominio público, CC BY y CC BY-SA; las BY se acreditan en
// /creditos-fotos). Dos pasos, para que ninguna foto suba sin que alguien la haya mirado:
//   POST { buscar: ["almonds", …] }            → por consulta, hasta 6 candidatas con miniatura (base64).
//   POST { aplicar: [{ codigo, id }, …] }      → baja la foto elegida (id de Openverse), la recorta cuadrada,
//                                               la sube al Blob, la deja como foto principal y anota el crédito.
// El ajuste del catálogo ya no la pisa (ver catalogo/ajustar).
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { put, list } from "@vercel/blob";
import sharp from "sharp";
import { formatoFotoSeguro, OPCIONES_SHARP_EXTERNA } from "@/lib/imagen-externa";
import { prisma } from "@/lib/prisma";
import type { Credito } from "@/lib/creditos-fotos";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Hit = {
  id: string; url: string; thumbnail?: string; width?: number; height?: number; title?: string; license?: string;
  license_version?: string; creator?: string; foreign_landing_url?: string;
};
type Cand = { id: string; titulo: string; lic: string; mini: string };
const UA = { "user-agent": "AcopioSaludable/1.0 (acopiosaludable.com)" };
const API = "https://api.openverse.org/v1/images/";

async function pedir(u: string): Promise<Response | null> {
  let r: Response | null = null;
  for (let i = 0; i < 3; i++) {
    r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20_000) }).catch(() => null);
    if (r?.status !== 429) break;
    await new Promise((ok) => setTimeout(ok, 4000 * (i + 1)));
  }
  return r?.ok ? r : null;
}

async function buscar(q: string): Promise<Hit[]> {
  const r = await pedir(`${API}?q=${encodeURIComponent(q)}&license=cc0,pdm,by,by-sa&category=photograph&page_size=20&mature=false`);
  const j = ((await r?.json().catch(() => ({}))) ?? {}) as { results?: Hit[] };
  const palabras = q.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const pts = (h: Hit) => palabras.filter((w) => (h.title ?? "").toLowerCase().includes(w)).length;
  return (j.results ?? []).filter((h) => (h.width ?? 0) >= 500 && (h.height ?? 0) >= 400).sort((a, b) => pts(b) - pts(a));
}

async function bajar(url: string): Promise<Buffer | null> {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25_000) }).catch(() => null);
  if (!r?.ok) return null;
  const b = Buffer.from(await r.arrayBuffer());
  return b.length > 5000 && b.length < 25 * 1024 * 1024 ? b : null;
}

async function imagen(h: Hit, chica = false): Promise<Buffer | null> {
  const crudo = chica ? ((h.thumbnail ? await bajar(h.thumbnail) : null) ?? (await bajar(h.url))) : ((await bajar(h.url)) ?? (h.thumbnail ? await bajar(h.thumbnail) : null));
  // Imagen de un sitio ajeno: solo JPEG/PNG/WebP reales, con tope de píxeles (ver imagen-externa.ts).
  if (!crudo || !formatoFotoSeguro(crudo)) return null;
  const s = sharp(crudo, OPCIONES_SHARP_EXTERNA).rotate().resize(chica ? 180 : 900, chica ? 180 : 900, { fit: "cover", position: "attention" });
  return chica ? s.jpeg({ quality: 55 }).toBuffer() : s.modulate({ saturation: 1.06 }).webp({ quality: 80 }).toBuffer();
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { buscar?: string[]; aplicar?: { codigo: string; id: string }[]; ver?: string[]; restaurar?: string[]; pisar?: boolean };

  // Diagnóstico: la foto actual y las anteriores de cada código.
  if (b.ver?.length) {
    const ps = await prisma.product.findMany({ where: { codigo: { in: b.ver.slice(0, 500) } }, select: { codigo: true, fotoUrl: true, fotos: true } });
    return NextResponse.json(Object.fromEntries(ps.map((p: { codigo: string; fotoUrl: string | null; fotos: string[] }) => [p.codigo, { fotoUrl: p.fotoUrl, fotos: p.fotos }])));
  }
  // Vuelve a poner como principal la primera foto propia (no de Openverse) que tenía el producto.
  if (b.restaurar?.length) {
    const out: Record<string, string> = {};
    for (const codigo of b.restaurar.slice(0, 200)) {
      const p = await prisma.product.findUnique({ where: { codigo }, select: { fotos: true } });
      const propia = p?.fotos.find((f: string) => /^https:/.test(f) && !f.includes("openverse-"));
      if (!p || !propia) { out[codigo] = "sin foto propia"; continue; }
      await prisma.product.update({ where: { codigo }, data: { fotoUrl: propia, fotos: [propia, ...p.fotos.filter((f: string) => f !== propia && !f.includes("openverse-"))] } });
      out[codigo] = propia;
    }
    revalidatePath("/", "layout");
    return NextResponse.json(out);
  }

  if (b.buscar?.length) {
    const out: Record<string, Cand[]> = {};
    for (const q of b.buscar.slice(0, 8)) {
      const cands: Cand[] = [];
      for (const h of (await buscar(q)).slice(0, 9)) {
        if (cands.length >= 6) break;
        const mini = await imagen(h, true).catch(() => null);
        if (mini) cands.push({ id: h.id, titulo: (h.title ?? "").slice(0, 50), lic: h.license ?? "", mini: mini.toString("base64") });
      }
      out[q] = cands;
    }
    return NextResponse.json(out);
  }

  const out: Record<string, string> = {};
  const nuevos: Credito[] = [];
  for (const it of (b.aplicar ?? []).slice(0, 25)) {
    try {
      const h = (await (await pedir(`${API}${it.id}/`))?.json().catch(() => null)) as Hit | null;
      if (!h?.url) { out[it.codigo] = "no encontré la foto"; continue; }
      const img = await imagen(h);
      if (!img) { out[it.codigo] = "no se pudo bajar"; continue; }
      const p = await prisma.product.findUnique({ where: { codigo: it.codigo }, select: { fotos: true, fotoUrl: true, producto: true, presentacion: true } });
      if (!p) { out[it.codigo] = "no existe"; continue; }
      // Una foto propia (subida desde el panel o del proveedor) no se pisa con una de Openverse.
      if (!b.pisar && p.fotoUrl && /^https:/.test(p.fotoUrl) && !p.fotoUrl.includes("openverse-")) { out[it.codigo] = "tiene foto propia"; continue; }
      const subida = await put(`productos/openverse-${h.id.slice(0, 8)}-${it.codigo.toLowerCase()}.webp`, img, {
        access: "public", contentType: "image/webp", addRandomSuffix: false, allowOverwrite: true,
      });
      await prisma.product.update({
        where: { codigo: it.codigo },
        data: { fotoUrl: subida.url, fotos: [subida.url, ...p.fotos.filter((f: string) => f !== subida.url)].slice(0, 4) },
      });
      if (h.license !== "cc0" && h.license !== "pdm") {
        nuevos.push({ producto: `${p.producto} ${p.presentacion}`.trim(), titulo: h.title ?? "", autor: h.creator ?? "", licencia: `CC ${(h.license ?? "").toUpperCase()} ${h.license_version ?? ""}`.trim(), fuente: h.foreign_landing_url ?? "" });
      }
      out[it.codigo] = subida.url;
    } catch (e) {
      out[it.codigo] = `error: ${String(e).slice(0, 120)}`;
    }
  }
  if (nuevos.length) {
    // Las fotos con atribución (CC BY / BY-SA) se acreditan en /creditos-fotos.
    const prev = await list({ prefix: "productos/creditos.json" }).then((l) => l.blobs[0]?.url).catch(() => undefined);
    const viejos: Credito[] = prev ? await fetch(`${prev}?t=${Date.now()}`).then((x) => x.json()).catch(() => []) : [];
    const todos = [...viejos.filter((c) => !nuevos.some((n) => n.producto === c.producto)), ...nuevos];
    await put("productos/creditos.json", JSON.stringify(todos), { access: "public", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
  }
  if (b.aplicar?.length) revalidatePath("/", "layout");
  return NextResponse.json(out);
}
