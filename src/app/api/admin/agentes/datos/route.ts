// Datos para los agentes (también sirve con la sesión de Santiago). Solo administrador o clave de agentes.
//   GET ?que=pedidos                 → pedidos abiertos + entregados/cancelados de los últimos 7 días, con ítems y notas
//   GET ?que=charlas&horas=24        → charlas de WhatsApp con movimiento en las últimas N horas (últimos 12 mensajes)
//   GET ?que=charla&telefono=549…    → una charla entera (últimos 60 mensajes)
//   GET ?que=resumenes&horas=48      → una línea por charla: calor (caliente/tibio/frio/cliente), qué quiere y próximo paso
//   POST { accion: "estado", id, estado, nota?, silencioso? } → cambia el estado de un pedido (mismo efecto que el panel:
//        ENVIADO avisa «ya está en el reparto de hoy, el repartidor te escribe» por WhatsApp; ENTREGADO con pago manda gracias + referidos; silencioso = sin avisos)
import { NextResponse } from "next/server";
import type { EstadoPedido } from "@prisma/client";
import { esAdmin } from "@/lib/admin-acceso";
import { prisma } from "@/lib/prisma";
import { aplicarEstadoPedido } from "@/lib/pedido-estado";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const n = (d: unknown) => Math.round(Number(d) || 0);

export async function GET(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const u = new URL(req.url).searchParams;
  const que = u.get("que");

  if (que === "resumenes") {
    const { resumenesCharlas } = await import("@/lib/resumen-charlas");
    const horas = Math.min(168, Number(u.get("horas")) || 48);
    return NextResponse.json({ resumenes: await resumenesCharlas(horas, 40, 25) });
  }

  if (que === "pedidos") {
    const hace7 = new Date(Date.now() - 7 * 86_400_000);
    const os = await prisma.order.findMany({
      where: { OR: [{ estado: { notIn: ["ENTREGADO", "CANCELADO"] } }, { updatedAt: { gte: hace7 } }] },
      include: { items: true, eventos: { orderBy: { fecha: "desc" }, take: 5 } },
      orderBy: { id: "asc" },
      take: 100,
    });
    return NextResponse.json({
      pedidos: os.map((o) => ({
        id: o.id,
        codigo: `AS-${String(o.id).padStart(5, "0")}`,
        estado: o.estado,
        creado: o.createdAt,
        nombre: o.nombre,
        telefono: o.telefono,
        direccion: `${o.calle}, ${o.ciudad}`,
        ciudad: o.ciudad,
        notas: o.notas,
        medioPago: o.medioPago,
        pagado: !!o.pagadoAt,
        total: n(o.total),
        envio: { nombre: o.envioNombre, cobrado: n(o.envioCobrado) },
        origen: (o as unknown as { origen?: string | null }).origen ?? null,
        items: o.items.map((i) => ({ producto: i.producto, presentacion: i.presentacion, cantidad: i.cantidad, precio: n(i.precioUnitario), combo: i.comboSlug })),
        eventos: o.eventos.map((e) => ({ fecha: e.fecha, estado: e.estado, nota: e.nota })),
      })),
    });
  }

  if (que === "charlas") {
    const horas = Math.min(168, Math.max(1, Number(u.get("horas")) || 24));
    const desde = new Date(Date.now() - horas * 3_600_000);
    const cs = await prisma.$queryRaw<{ telefono: string; nombre: string | null; estado: string; anuncioTitulo: string | null; prospecto: string | null; negocio: string | null; pedido: string | null; baja: boolean; ultimoMensaje: Date }[]>`
      SELECT "telefono", "nombre", "estado", "anuncioTitulo", "prospecto", "negocio", "pedido", "baja", "ultimoMensaje" FROM "WhatsappConversacion"
      WHERE "ultimoMensaje" >= ${desde} ORDER BY "ultimoMensaje" DESC LIMIT 80`;
    const ms = cs.length
      ? await prisma.$queryRaw<{ telefono: string; de: string; texto: string; fecha: Date }[]>`
          SELECT "telefono", "de", "texto", "fecha" FROM (
            SELECT "telefono", "de", "texto", "fecha", row_number() OVER (PARTITION BY "telefono" ORDER BY "fecha" DESC) AS r
            FROM "WhatsappMensaje" WHERE "telefono" = ANY(${cs.map((c) => c.telefono)})
          ) x WHERE r <= 12 ORDER BY "fecha" ASC`
      : [];
    const ultimoCliente = (t: string) => [...ms].reverse().find((m) => m.telefono === t && m.de === "cliente")?.fecha ?? null;
    return NextResponse.json({
      charlas: cs.map((c) => {
        const uc = ultimoCliente(c.telefono);
        return {
          ...c,
          ventana24hAbierta: !!uc && Date.now() - new Date(uc).getTime() < 23.5 * 3_600_000,
          mensajes: ms.filter((m) => m.telefono === c.telefono).map((m) => ({ de: m.de, texto: m.texto.slice(0, 600), fecha: m.fecha })),
        };
      }),
    });
  }

  if (que === "charla") {
    const tel = (u.get("telefono") ?? "").replace(/\D/g, "");
    if (!tel) return NextResponse.json({ error: "Falta telefono" }, { status: 400 });
    const ms = await prisma.$queryRaw<{ de: string; texto: string; fecha: Date }[]>`
      SELECT "de", "texto", "fecha" FROM "WhatsappMensaje" WHERE "telefono" = ${tel} ORDER BY "fecha" DESC LIMIT 60`;
    return NextResponse.json({ telefono: tel, mensajes: ms.reverse() });
  }

  return NextResponse.json({ error: "que = pedidos | charlas | charla" }, { status: 400 });
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { accion?: string; id?: number; estado?: string; nota?: string; silencioso?: boolean };
  if (b.accion !== "estado") return NextResponse.json({ error: "accion = estado" }, { status: 400 });
  const id = Number(b.id);
  if (!id || !b.estado) return NextResponse.json({ error: "Faltan id y estado" }, { status: 400 });
  try {
    await aplicarEstadoPedido(id, b.estado as EstadoPedido, { nota: b.nota?.slice(0, 300) ?? null, silencioso: !!b.silencioso });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 400 });
  }
}
