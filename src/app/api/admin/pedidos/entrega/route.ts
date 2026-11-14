// Corregir los datos de entrega de un pedido (calle, ciudad, ubicación) desde los agentes.
// 12/11: el pedido de Olga quedó con ciudad «A confirmar» y el mapa la mandaba a Córdoba capital.
// No le escribe al cliente.
import { esAdmin, esSesionAdmin } from "@/lib/admin-acceso";
import { alRecibirBloqueo } from "@/lib/cobro-permiso";
import { zonaDeLugar } from "@/lib/envio-zona";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: number; codigo?: string; calle?: string; ciudad?: string; ubicacion?: string; notas?: string; alRecibir?: boolean };
  const id = b.id ?? Number.parseInt(String(b.codigo ?? "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: "Falta id o codigo (AS-00051)" }, { status: 400 });
  const data: Record<string, string> = {};
  // 13/11: Santiago le dijo a la clienta «transferís cuando lo recibís»: el pedido pasa a cobrarse al entregar y entra a la pizarra.
  // 14/11: con la clave de agentes, solo un pedido que espera el pago y en la zona de reparto propio; queda registrado.
  let alRecibirNuevo = false;
  if (b.alRecibir === true) {
    const actual = await prisma.order.findUnique({ where: { id }, select: { estado: true, medioPago: true, pagadoAt: true, ciudad: true, provincia: true } });
    if (!actual) return NextResponse.json({ error: "No existe ese pedido" }, { status: 404 });
    const ciudad = b.ciudad?.trim() || actual.ciudad;
    const motivo = alRecibirBloqueo({ estado: actual.estado, medioPago: actual.medioPago, pagado: !!actual.pagadoAt }, zonaDeLugar(ciudad, actual.provincia)?.tipo ?? null);
    if (motivo && !(await esSesionAdmin())) return NextResponse.json({ error: `No se pasa a cobrar al entregar: ${motivo}` }, { status: 403 });
    alRecibirNuevo = actual.medioPago !== "AL_RECIBIR";
    data.medioPago = "AL_RECIBIR";
  }
  if (b.calle?.trim()) data.calle = b.calle.trim().slice(0, 160);
  if (b.ciudad?.trim()) data.ciudad = b.ciudad.trim().slice(0, 80);
  if (b.ubicacion?.trim()) data.ubicacion = b.ubicacion.trim().slice(0, 200);
  // 13/11: la nota sale en la tarjeta de la pizarra (un cambio de producto que pidió el cliente, el horario).
  if (b.notas?.trim()) data.notas = b.notas.trim().slice(0, 300);
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada para cambiar (calle, ciudad, ubicacion, notas)" }, { status: 400 });
  const p = await prisma.order.update({ where: { id }, data, select: { id: true, calle: true, ciudad: true, ubicacion: true, notas: true, medioPago: true } });
  if (alRecibirNuevo) {
    await prisma.orderEvent.create({ data: { orderId: id, estado: "PENDIENTE_PAGO", nota: `Pasa a cobrar al entregar (${(await esSesionAdmin()) ? "Santiago" : "agente"})` } });
  }
  revalidatePath("/admin/pedidos");
  return NextResponse.json({ ok: true, pedido: p });
}
