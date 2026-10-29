// Crear a mano el pedido de una venta cerrada en el chat (por ejemplo, una de antes de que
// las ventas por WhatsApp se cargaran solas). Solo administrador.
//
// POST { telefono, nombre, camino, medio: "TRANSFERENCIA" | "AL_RECIBIR", lugar, costoEnvio, direccion?, horario?, mayoristaPct? }
// mayoristaPct (10, 15 o 20): precio por volumen sobre la lista web; reemplaza el descuento por transferencia.

import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { completarEntrega, crearPedidoWhatsapp, numeroPedido } from "@/lib/pedidos";
import { leerPedido } from "@/lib/pedido-enlace";
import { guardarPedido } from "@/lib/whatsapp-memoria";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = (k: string) => (typeof b[k] === "string" ? String(b[k]).trim() : "");
  const telefono = s("telefono").replace(/\D/g, "");
  const camino = s("camino");
  if (!telefono || !camino.startsWith("/carrito?p=")) return NextResponse.json({ error: "Faltan teléfono o pedido" }, { status: 400 });
  const medio = s("medio") === "AL_RECIBIR" ? "AL_RECIBIR" : "TRANSFERENCIA";
  const pedido = await crearPedidoWhatsapp({
    lineas: leerPedido(camino.slice("/carrito?p=".length)),
    medioPago: medio,
    nombre: s("nombre"),
    telefono,
    envio: { lugar: s("lugar") || "A confirmar", costo: Number.isFinite(Number(b.costoEnvio)) && b.costoEnvio !== "" ? Number(b.costoEnvio) : null },
    mayoristaPct: Number(b.mayoristaPct) || 0,
  });
  if (s("direccion") || s("horario")) await completarEntrega(pedido.id, { direccion: s("direccion"), horario: s("horario") });
  await guardarPedido(telefono, `orden:${pedido.id}`);
  return NextResponse.json({ ok: true, pedido: numeroPedido(pedido.id), id: pedido.id, total: Number(pedido.total) });
}
