// El QR de reposición: lo pega el negocio en la alacena y, al escanearlo, le carga el último pedido
// en el carrito con los precios de hoy. No muestra datos del pedido: solo redirige.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enlaceRepetir } from "@/lib/repetir";
import { urlSitio } from "@/lib/sitio";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pedido = /^[\w-]{10,60}$/.test(token) ? await prisma.order.findUnique({ where: { token }, include: { items: true } }) : null;
  if (!pedido?.items.length) return NextResponse.redirect(`${urlSitio()}/catalogo`);
  return NextResponse.redirect(`${urlSitio()}${enlaceRepetir(pedido.items)}&ref=qr-reposicion`);
}
