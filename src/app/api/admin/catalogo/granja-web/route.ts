// Cruza el catálogo con la disponibilidad real de la web de La Granja (ver lib/granja-web.ts).
// GET: el plan sin tocar nada. POST ?aplicar=1: pausa lo que La Granja no tiene y reactiva lo que volvió.
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cruzarConWebGranja, leerCajas } from "@/lib/granja-web";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const qs = new URL(req.url).searchParams.get("qs");
  // 20/11: búsqueda de la web de La Granja (el formulario es POST «buscar») y cualquier página suya (ofertas, promos).
  const buscar = new URL(req.url).searchParams.get("buscar");
  const pag = new URL(req.url).searchParams.get("pag");
  if (buscar || pag) {
    const u = `https://lagranjadelcentro.com.ar/${pag && /^[a-z0-9_-]+\.php(\?[\w=&%-]*)?$/i.test(pag) ? pag : "productos.php"}`;
    const fd = new FormData();
    if (buscar) fd.set("buscar", buscar);
    const html = await fetch(u, buscar ? { method: "POST", body: fd, signal: AbortSignal.timeout(25_000) } : { signal: AbortSignal.timeout(25_000) }).then((r) => r.text());
    const i = html.indexOf(new URL(req.url).searchParams.get("busco") ?? "box-content-1");
    return NextResponse.json({ cajas: leerCajas(html).slice(0, 80), trozo: html.slice(Math.max(0, i - 200), i + 2500), links: [...new Set([...html.matchAll(/href="([a-z0-9_-]+\.php[^"]*)"/gi)].map((m) => m[1]))].slice(0, 80) });
  }
  if (qs) {
    const html = await fetch(`https://lagranjadelcentro.com.ar/productos.php?${qs}`, { signal: AbortSignal.timeout(25_000) }).then((r) => r.text());
    const i = html.indexOf(new URL(req.url).searchParams.get("busco") ?? "box-content-1");
    return NextResponse.json({ cajas: leerCajas(html).slice(0, 60), trozo: html.slice(Math.max(0, i - 200), i + 2500) });
  }
  return NextResponse.json(await cruzarConWebGranja(false));
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const aplicar = new URL(req.url).searchParams.get("aplicar") === "1";
  const r = await cruzarConWebGranja(aplicar);
  if (r.aplicado) revalidatePath("/", "layout");
  return NextResponse.json(r);
}
