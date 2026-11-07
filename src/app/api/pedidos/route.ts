import { NextResponse } from "next/server";
import { ErrorPedido, crearPedido } from "@/lib/pedidos";
import { mpConfigurado } from "@/lib/mercadopago";
import { admiteFreno, ipDe, PEDIDOS_MAX_POR_IP, VENTANA_PUBLICA_MS } from "@/lib/freno";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Cada pedido manda un mail al email que se escriba: sin tope, la tienda serviría para mandar mails a terceros.
  if (!admiteFreno(`pedidos:${ipDe(req)}`, PEDIDOS_MAX_POR_IP, VENTANA_PUBLICA_MS)) {
    return NextResponse.json({ error: "Recibimos varios pedidos seguidos desde tu conexión. Esperá unos minutos o escribinos por WhatsApp y te lo armamos." }, { status: 429 });
  }
  let cuerpo: { lineas?: unknown; cliente?: unknown; envioOpcionId?: unknown; medioPago?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  try {
    const pedido = await crearPedido({ ...cuerpo, mpDisponible: mpConfigurado() });
    // Con Mercado Pago pasa por /pagar, que crea la preferencia y redirige; si falla, el pedido queda para reintentar.
    return NextResponse.json({ url: pedido.medioPago === "MERCADOPAGO" ? `/pedido/${pedido.token}/pagar` : `/pedido/${pedido.token}?nuevo=1` });
  } catch (e) {
    if (e instanceof ErrorPedido) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "No pudimos registrar el pedido. Probá de nuevo." }, { status: 500 });
  }
}
