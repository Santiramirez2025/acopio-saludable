import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearPreferencia, mpConfigurado } from "@/lib/mercadopago";
import { numeroPedido } from "@/lib/pedidos";
import { urlSitio } from "@/lib/sitio";

export const dynamic = "force-dynamic";

// Crea la preferencia de Checkout Pro y manda al cliente a pagar. Sirve también para reintentar.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const volver = (motivo?: string) => NextResponse.redirect(`${urlSitio()}/pedido/${token}${motivo ? `?mp=${motivo}` : ""}`);
  const pedido = await prisma.order.findUnique({ where: { token } });
  if (!pedido) return NextResponse.json({ error: "Pedido inexistente" }, { status: 404 });
  if (pedido.estado !== "PENDIENTE_PAGO" || pedido.medioPago !== "MERCADOPAGO") return volver();
  if (!mpConfigurado()) return volver("no-disponible");
  try {
    const pref = await crearPreferencia({ token, numero: numeroPedido(pedido.id), total: Number(pedido.total), nombre: pedido.nombre, email: pedido.email });
    await prisma.order.update({ where: { id: pedido.id }, data: { mpPreferenceId: pref.id } });
    return NextResponse.redirect(pref.init_point);
  } catch (e) {
    console.error(e);
    return volver("error");
  }
}
