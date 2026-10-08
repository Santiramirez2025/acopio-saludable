import { NextResponse } from "next/server";
import { ErrorPedido, prepararEnvio } from "@/lib/pedidos";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let cuerpo: { lineas?: unknown; cp?: unknown; provincia?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  try {
    const p = await prepararEnvio(cuerpo.lineas, String(cuerpo.cp ?? ""), String(cuerpo.provincia ?? ""));
    // Al cliente no le mandamos el costo real, solo lo que paga.
    return NextResponse.json({
      opciones: p.opciones.map(({ costo: _costo, ...o }) => o),
      pesoTotalKg: Math.round(p.pesoTotalG / 100) / 10,
      bultos: p.bultos.length,
      subtotal: p.cotizacion.subtotal,
      puedePagar: p.cotizacion.puedePagar,
    });
  } catch (e) {
    if (e instanceof ErrorPedido) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "No pudimos calcular el envío. Probá de nuevo." }, { status: 500 });
  }
}
