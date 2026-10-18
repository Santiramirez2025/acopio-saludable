// El checkout pregunta si quien compra tiene beneficio por recomendación, para mostrarlo antes de confirmar.
// Devuelve solo el porcentaje y el texto: nada sobre quién recomendó ni sobre otros pedidos.

import { NextResponse } from "next/server";
import { beneficioRecomendacion } from "@/lib/recomendacion-db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let c: { telefono?: unknown; email?: unknown; origen?: unknown };
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ pct: 0, texto: null });
  }
  const s = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
  try {
    const b = await beneficioRecomendacion({ telefono: s(c.telefono, 40), email: s(c.email, 160), origen: s(c.origen, 300) });
    return NextResponse.json({ pct: b.pct, texto: b.texto, tipo: b.tipo });
  } catch (e) {
    console.error("beneficio recomendación", e);
    return NextResponse.json({ pct: 0, texto: null });
  }
}
