import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listaDeCompra, numeroPedido } from "@/lib/pedidos";

export const dynamic = "force-dynamic";

// El prefijo ' evita que Excel interprete el contenido como fórmula; los códigos van entre comillas para conservar ceros.
const celda = (v: string | number) => {
  const s = String(v);
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const pedido = /^\d+$/.test(id) ? await prisma.order.findUnique({ where: { id: Number(id) }, include: { items: true } }) : null;
  if (!pedido) return NextResponse.json({ error: "Pedido inexistente" }, { status: 404 });
  const { renglones, total } = listaDeCompra(pedido.items);
  const filas = [
    ["codigo", "producto", "presentacion", "cantidad", "costo", "total"].map(celda).join(","),
    ...renglones.map((r) => [r.codigo, r.producto, r.presentacion, r.cantidad, r.costo.toFixed(2), r.total.toFixed(2)].map(celda).join(",")),
    ["", "TOTAL", "", "", "", total.toFixed(2)].map(celda).join(","),
  ];
  return new NextResponse(`﻿${filas.join("\r\n")}\r\n`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="compra-${numeroPedido(pedido.id)}.csv"` },
  });
}
