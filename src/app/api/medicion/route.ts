// Registro propio de la tienda (lo manda lib/medicion.ts desde el navegador): visitas, productos vistos,
// carrito, checkout y clics a WhatsApp. Anónimo (una sesión al azar por pestaña), sin datos personales.
// Lo leen Tomi y el panel con GET /api/admin/analisis?parte=trafico.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const EVENTOS = new Set(["pagina", "contacto", "ver_producto", "agregar", "iniciar_compra", "compra", "lead_sistema"]);
const ROBOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|vercel/i;

export async function POST(req: Request) {
  if (ROBOTS.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  const b = (await req.json().catch(() => null)) as { e?: unknown; r?: unknown; v?: unknown; s?: unknown; o?: unknown } | null;
  const e = typeof b?.e === "string" ? b.e : "";
  if (!EVENTOS.has(e)) return new NextResponse(null, { status: 204 });
  const detalle = JSON.stringify({
    r: typeof b?.r === "string" ? b.r.slice(0, 120) : null,
    v: typeof b?.v === "number" && Number.isFinite(b.v) ? Math.round(b.v) : null,
    s: typeof b?.s === "string" ? b.s.replace(/[^a-z0-9-]/gi, "").slice(0, 16) : null,
    o: typeof b?.o === "string" ? b.o.replace(/[^a-z0-9.:/_-]/gi, "").slice(0, 60) : null,
  });
  await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${`ev-${e}`}, true, ${detalle})`.catch(() => null);
  return new NextResponse(null, { status: 204 });
}
