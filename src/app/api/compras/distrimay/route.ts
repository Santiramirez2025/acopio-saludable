// Lista de compra para el botón «Cargar en Distrimay». Se llama desde compras.distrimay.com.

import { NextResponse } from "next/server";
import { listaDeCompra, numeroPedido, pedidosPorComprar } from "@/lib/pedidos";
import { claveComprasValida } from "@/lib/compra-distrimay";

export const dynamic = "force-dynamic";

const CORS = { "Access-Control-Allow-Origin": "https://compras.distrimay.com", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Max-Age": "600" };

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(req: Request) {
  if (!claveComprasValida(new URL(req.url).searchParams.get("k"))) return NextResponse.json({ error: "Clave inválida" }, { status: 401, headers: CORS });
  const pedidos = await pedidosPorComprar();
  const { renglones } = listaDeCompra(pedidos.flatMap((p) => p.items));
  return NextResponse.json(
    {
      pedidos: pedidos.map((p) => numeroPedido(p.id)),
      items: renglones.map((r) => ({ codigo: r.codigo, producto: `${r.producto} ${r.presentacion}`.trim(), cantidad: r.cantidad })),
    },
    { headers: CORS },
  );
}
