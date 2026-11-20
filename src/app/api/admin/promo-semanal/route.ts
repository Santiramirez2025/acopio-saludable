// Promo de la semana a clientes que ya compraron (ver lib/promo-semanal).
//   GET                                   → la promo guardada, si está vigente y a quiénes saldría hoy.
//   POST { accion: "guardar", titulo, contexto, hasta, camino?, imagen? | imagenBase64? } → la deja lista.
//   POST { accion: "plantilla" }           → crea la plantilla en Meta con la gráfica guardada de ejemplo.
//   POST { accion: "probar", telefono }    → la manda a ese número solo.
//   POST { accion: "enviar" }              → la manda a todos los que corresponde (lo hace el cron de los jueves).
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { esAdmin } from "@/lib/admin-acceso";
import { correrPromo, crearPlantillaPromo, guardarPromo, leerPromo, promoVigente } from "@/lib/promo-semanal";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const promo = await leerPromo();
  const sim = await correrPromo({ simular: true });
  return NextResponse.json({ promo, vigente: promoVigente(promo), saldriaA: sim.candidatos ?? 0, nombres: sim.enviados.slice(0, 80), error: sim.error });
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, string | undefined>;
  if (b.accion === "guardar") {
    if (!b.titulo || !b.contexto || !b.hasta) return NextResponse.json({ error: "faltan titulo, contexto o hasta" }, { status: 400 });
    if (b.titulo.length > 120) return NextResponse.json({ error: "el título va en el mensaje: máximo 120 caracteres" }, { status: 400 });
    let imagen = b.imagen;
    if (b.imagenBase64) {
      const bytes = Buffer.from(b.imagenBase64.replace(/^data:[^,]+,/, ""), "base64");
      const subida = await put(`promos/promo-${b.hasta}-${Date.now()}.jpg`, bytes, { access: "public", contentType: "image/jpeg", addRandomSuffix: false });
      imagen = subida.url;
    }
    if (!imagen?.startsWith("https://")) return NextResponse.json({ error: "falta la gráfica (imagen https o imagenBase64)" }, { status: 400 });
    return NextResponse.json(await guardarPromo({ titulo: b.titulo, contexto: b.contexto, hasta: b.hasta, camino: b.camino, imagen }));
  }
  if (b.accion === "plantilla") {
    const p = await leerPromo();
    if (!p?.imagen) return NextResponse.json({ error: "primero guardá una promo con su gráfica" }, { status: 400 });
    return NextResponse.json(await crearPlantillaPromo(p.imagen));
  }
  if (b.accion === "probar" && b.telefono) return NextResponse.json(await correrPromo({ solo: b.telefono.replace(/\D/g, "") }));
  if (b.accion === "enviar") return NextResponse.json(await correrPromo());
  return NextResponse.json({ error: "accion: guardar | plantilla | probar | enviar" }, { status: 400 });
}
