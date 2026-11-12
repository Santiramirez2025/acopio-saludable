// Cambiar el estado de un pedido desde el panel o desde un agente (clave x-agente-clave).
// 12/11: Santiago pidió limpiar el panel («sacame los pedidos que están innecesariamente»);
// hasta hoy solo se podía desde la pantalla del pedido. Silencioso por defecto: no se le escribe al cliente.
import { esAdmin } from "@/lib/admin-acceso";
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
  try {
    await aplicarEstadoPedido(id, estado, { nota: b.nota ?? "Desde la API de agentes", silencioso: b.avisarCliente !== true });
    revalidatePath("/admin/pedidos");
    return NextResponse.json({ ok: true, id, estado });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
