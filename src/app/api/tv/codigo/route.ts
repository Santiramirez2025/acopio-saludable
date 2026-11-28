// La TV pide un código para vincularse (público: el código solo sirve si Santiago lo aprueba desde el panel).
// 28/11 (Rodri): cada pedido escribía una fila en la base sin ningún tope; ahora frena por IP y en total.
import { NextResponse } from "next/server";
import { codigosTvRecientes, crearCodigo } from "@/lib/tv";
import { admiteCodigoTv, admiteFreno, ipDe, TV_CODIGO_MAX_POR_IP, TV_CODIGO_VENTANA_MS } from "@/lib/freno";

export const dynamic = "force-dynamic";

const FRENADO = { error: "Demasiados pedidos de código. Reintentando…" };

export async function POST(req: Request) {
  if (!admiteFreno(`tv-codigo:${ipDe(req)}`, TV_CODIGO_MAX_POR_IP, TV_CODIGO_VENTANA_MS)) return NextResponse.json(FRENADO, { status: 429 });
  try {
    if (!admiteCodigoTv(await codigosTvRecientes())) return NextResponse.json(FRENADO, { status: 429 });
    return NextResponse.json(await crearCodigo());
  } catch {
    // Sin el detalle del error: no se filtra nada de la base a una ruta pública.
    return NextResponse.json({ error: "No pude generar un código, probá de nuevo" }, { status: 500 });
  }
}
