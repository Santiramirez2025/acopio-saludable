// Cambiar el estado de un pedido desde el panel o desde un agente (clave x-agente-clave).
// 12/11: Santiago pidió limpiar el panel («sacame los pedidos que están innecesariamente»);
// hasta hoy solo se podía desde la pantalla del pedido. Silencioso por defecto: no se le escribe al cliente.
import { esAdmin, esSesionAdmin } from "@/lib/admin-acceso";
import { cobroRequiereSesion } from "@/lib/cobro-permiso";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { aplicarEstadoPedido } from "@/lib/pedido-estado";
import type { EstadoPedido } from "@prisma/client";

export const dynamic = "force-dynamic";

const ESTADOS = ["PENDIENTE_PAGO", "PAGADO", "PREPARADO", "ENVIADO", "ENTREGADO", "CANCELADO"] as const;

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: number; codigo?: string; estado?: string; nota?: string; avisarCliente?: boolean };
  const estado = String(b.estado ?? "") as EstadoPedido;
  if (!ESTADOS.includes(estado as (typeof ESTADOS)[number])) return NextResponse.json({ error: `estado inválido; usar ${ESTADOS.join("|")}` }, { status: 400 });
  const id = b.id ?? Number.parseInt(String(b.codigo ?? "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: "Falta id o codigo (AS-00051)" }, { status: 400 });
  // Mismo control que /agentes/datos (Rodri 13/11): pasar a Pagado o Entregado un pedido sin pago registra el
  // cobro y lo manda al reparto. Eso lo hace solo Santiago con su sesión o su WhatsApp, nunca la clave de agentes.
  const actual = await prisma.order.findUnique({ where: { id }, select: { pagadoAt: true } });
  if (!actual) return NextResponse.json({ error: "No existe ese pedido" }, { status: 404 });
  if (cobroRequiereSesion(estado, !!actual.pagadoAt) && !(await esSesionAdmin())) {
    return NextResponse.json({ error: "Pasar a Pagado o Entregado un pedido sin pago registra el cobro: eso lo hace solo Santiago (panel o su WhatsApp, «marcá pagado AS-…»). Avisale con el número de pedido." }, { status: 403 });
  }
  try {
    await aplicarEstadoPedido(id, estado, { nota: b.nota ?? "Desde la API de agentes", silencioso: b.avisarCliente !== true });
    revalidatePath("/admin/pedidos");
    return NextResponse.json({ ok: true, id, estado });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
