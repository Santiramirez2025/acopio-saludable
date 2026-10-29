// Registro propio de la tienda (lo manda lib/medicion.ts desde el navegador): visitas, productos vistos,
// carrito, checkout y clics a WhatsApp. Anónimo (una sesión al azar por pestaña), sin datos personales.
// Lo leen Tomi y el panel con GET /api/admin/analisis?parte=trafico.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { admiteFreno, admiteMedicion, ipDe } from "@/lib/freno";

export const dynamic = "force-dynamic";

const EVENTOS = new Set(["pagina", "contacto", "ver_producto", "agregar", "iniciar_compra", "compra", "lead_sistema"]);
const ROBOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|vercel/i;
// Dos frenos, los dos contestan 204 sin guardar (nada que adivinar ni reintentar):
// 1) por IP en memoria de la instancia (60 por minuto: una persona genera unos pocos; para un script que
//    pega muchas veces seguidas en la misma instancia), y 2) global contado en la base, que sí comparten
//    todas las instancias: por más IPs o instancias que use, la tabla no crece más de MEDICION_MAX_MINUTO
//    filas por minuto. El 1) solo no alcanzó: en producción pedidos seguidos caen en instancias distintas.
const MAX_POR_MINUTO = 60;
const CUERPO_MAX = 1500;

export async function POST(req: Request) {
  if (ROBOTS.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  if (Number(req.headers.get("content-length") ?? 0) > CUERPO_MAX) return new NextResponse(null, { status: 204 });
  if (!admiteFreno(`medicion:${ipDe(req)}`, MAX_POR_MINUTO, 60_000)) return new NextResponse(null, { status: 204 });
  const b = (await req.json().catch(() => null)) as { e?: unknown; r?: unknown; v?: unknown; s?: unknown; o?: unknown } | null;
  const e = typeof b?.e === "string" ? b.e : "";
  if (!EVENTOS.has(e)) return new NextResponse(null, { status: 204 });
  const [{ n }] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM "CronCorrida" WHERE "nombre" LIKE 'ev-%' AND "fecha" > now() - interval '1 minute'`.catch(() => [{ n: 0 }]);
  if (!admiteMedicion(n)) return new NextResponse(null, { status: 204 });
  const detalle = JSON.stringify({
    r: typeof b?.r === "string" ? b.r.slice(0, 120) : null,
    v: typeof b?.v === "number" && Number.isFinite(b.v) ? Math.round(b.v) : null,
    s: typeof b?.s === "string" ? b.s.replace(/[^a-z0-9-]/gi, "").slice(0, 16) : null,
    o: typeof b?.o === "string" ? b.o.replace(/[^a-z0-9.:/_-]/gi, "").slice(0, 60) : null,
  });
  await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${`ev-${e}`}, true, ${detalle})`.catch(() => null);
  return new NextResponse(null, { status: 204 });
}
