import { NextResponse } from "next/server";
import { firmaValida, mpConfigurado, obtenerPago } from "@/lib/mercadopago";
import { procesarPagoMp } from "@/lib/pedidos";

export const dynamic = "force-dynamic";

// Aviso de Mercado Pago. Nunca confiamos en el cuerpo: con el id consultamos el pago a Mercado Pago.
export async function POST(req: Request) {
  const url = new URL(req.url);
  let cuerpo: { type?: string; topic?: string; data?: { id?: string | number } } = {};
  try {
    cuerpo = await req.json();
  } catch {
    /* algunos avisos llegan solo con parámetros en la URL */
  }
  const tipo = cuerpo.type ?? cuerpo.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const id = String(cuerpo.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  if (tipo !== "payment" || !id) return NextResponse.json({ ok: true });
  if (!mpConfigurado()) return NextResponse.json({ error: "Mercado Pago sin configurar" }, { status: 503 });
  if (!firmaValida(req.headers, id)) return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, resultado: await procesarPagoMp(await obtenerPago(id)) });
  } catch (e) {
    console.error(e);
    // 500 para que Mercado Pago reintente el aviso más tarde.
    return NextResponse.json({ error: "No se pudo procesar" }, { status: 500 });
  }
}
