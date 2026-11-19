// Diagnóstico: cómo lista productos la web de La Granja (para cruzar disponibilidad con nuestro catálogo).
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const url = `https://lagranjadelcentro.com.ar/productos.php?${q.get("qs") ?? "id_cat=4"}`;
  const html = await fetch(url, { signal: AbortSignal.timeout(30_000) }).then((r) => r.text()).catch((e) => `ERR ${e}`);
  const cajas = html.split('class="box-content-1"').length - 1;
  const noDisp = html.split("No disponible").length - 1;
  const links = [...html.matchAll(/href="([^"]*(?:pag|page|pg)[^"]*)"/gi)].map((m) => m[1]).slice(0, 20);
  return NextResponse.json({ url, largo: html.length, cajas, noDisp, links, muestra: html.slice(html.indexOf('class="box-content-1"'), html.indexOf('class="box-content-1"') + 1500) });
}
