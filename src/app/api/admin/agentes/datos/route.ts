// Datos para los agentes (también sirve con la sesión de Santiago). Solo administrador o clave de agentes.
//   GET ?que=pedidos                 → pedidos abiertos + entregados/cancelados de los últimos 7 días, con ítems y notas
//   GET ?que=charlas&horas=24        → charlas de WhatsApp con movimiento en las últimas N horas (últimos 12 mensajes)
//   GET ?que=charla&telefono=549…    → una charla entera (últimos 60 mensajes)
//   GET ?que=resumenes&horas=48      → una línea por charla: calor (caliente/tibio/frio/cliente), qué quiere y próximo paso
//   POST { accion: "notas", id, notas, nota? } → corrige las notas del pedido (qué se cobra, cambios acordados)
//   POST { accion: "item", id, producto, presentacion?, cantidad, precio, costo? } → suma al pedido un renglón sin código
//        (producto cotizado a mano). Solo pedidos sin pagar. Suma precio × cantidad al subtotal y al total.
//   POST { accion: "total", id, total, nota } → corrige el total de un pedido sin pagar (la diferencia va como descuento o recargo).
//   POST { accion: "estado", id, estado, nota?, silencioso? } → cambia el estado de un pedido (mismo efecto que el panel:
//        ENVIADO avisa «ya está en el reparto de hoy, el repartidor te escribe» por WhatsApp; ENTREGADO = cobrado (registra el pago si faltaba) y manda gracias + referidos; silencioso = sin avisos)
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
    const m = await import("@/lib/resumen-charlas");
    const horas = Math.min(168, Number(u.get("horas")) || 48);
    const resumenes = await m.resumenesCharlas(horas, 40, 12); // 12 nuevos por llamada: entra en el tiempo de la función; los demás salen de la caché
    return NextResponse.json({ resumenes, charlas: m.ultimaCuenta, fallo: m.ultimoFallo || undefined });
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

  // Leads del Equipo de Agentes (Marcos): formulario de /agentes y charlas marcadas «sistema», con su etapa.
  if (que === "leads") {
    const filas = await prisma.$queryRaw<{ nombre: string; ok: boolean; detalle: string | null; fecha: Date }[]>`
      SELECT DISTINCT ON ("nombre") "nombre", "ok", "detalle", "fecha" FROM "CronCorrida" WHERE "nombre" LIKE 'lead-sistema-%' ORDER BY "nombre", "fecha" DESC`;
    const charlas = await prisma.$queryRaw<{ telefono: string; nombre: string | null; estado: string; anuncioTitulo: string | null; ultimoMensaje: Date; creado: Date }[]>`
      SELECT "telefono", "nombre", "estado", "anuncioTitulo", "ultimoMensaje", "creado" FROM "WhatsappConversacion" WHERE "prospecto" = 'sistema' ORDER BY "ultimoMensaje" DESC LIMIT 100`;
    return NextResponse.json({
      leads: filas.map((f) => ({ telefono: f.nombre.slice(13), fecha: f.fecha, ...(() => { try { return JSON.parse(f.detalle ?? "{}") as Record<string, unknown>; } catch { return {}; } })() })),
      charlas,
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
  const b = (await req.json().catch(() => ({}))) as { accion?: string; id?: number; estado?: string; nota?: string; notas?: string; silencioso?: boolean; producto?: string; presentacion?: string; cantidad?: number; precio?: number; costo?: number; total?: number };
  // Pedido cotizado a mano (Sara, 29/10: cacao Alzol y pasas rubias sin código): el panel quedaba $22.100 abajo.
  if (b.accion === "item" || b.accion === "total") {
    const id = Number(b.id);
    const o = id ? await prisma.order.findUnique({ where: { id } }) : null;
    if (!o) return NextResponse.json({ error: "No existe el pedido" }, { status: 404 });
    if (o.pagadoAt || o.estado === "CANCELADO" || o.estado === "ENTREGADO") return NextResponse.json({ error: "Solo se corrigen pedidos abiertos y sin pagar" }, { status: 400 });
    if (b.accion === "item") {
      const cantidad = Math.max(1, Math.round(Number(b.cantidad) || 1));
      const precio = Math.round(Number(b.precio) || 0);
      if (!b.producto?.trim() || precio <= 0) return NextResponse.json({ error: "Faltan producto y precio" }, { status: 400 });
      const suma = precio * cantidad;
      await prisma.$transaction([
        prisma.orderItem.create({ data: { orderId: id, codigo: "MANUAL", producto: b.producto.trim().slice(0, 120), presentacion: (b.presentacion ?? "").slice(0, 60), cantidad, precioUnitario: precio, costoUnitario: Math.round(Number(b.costo) || 0) } }),
        prisma.order.update({ where: { id }, data: { subtotal: { increment: suma }, total: { increment: suma }, costoProductos: { increment: Math.round(Number(b.costo) || 0) * cantidad } } }),
        prisma.orderEvent.create({ data: { orderId: id, estado: o.estado, nota: `Agregado a mano: ${cantidad}× ${b.producto.trim()} $${suma.toLocaleString("es-AR")}` } }),
      ]);
      const n = await prisma.order.findUniqueOrThrow({ where: { id } });
      return NextResponse.json({ ok: true, total: Number(n.total) });
    }
    const total = Math.round(Number(b.total) || 0);
    if (total <= 0 || !b.nota?.trim()) return NextResponse.json({ error: "Faltan total y nota (por qué cambia)" }, { status: 400 });
    const dif = Number(o.total) - total;
    await prisma.$transaction([
      prisma.order.update({ where: { id }, data: { total, descuento: { increment: dif } } }),
      prisma.orderEvent.create({ data: { orderId: id, estado: o.estado, nota: `Total corregido de $${Math.round(Number(o.total)).toLocaleString("es-AR")} a $${total.toLocaleString("es-AR")}: ${b.nota.slice(0, 200)}` } }),
    ]);
    return NextResponse.json({ ok: true, total });
  }
  // Corregir las notas del pedido (lo que se cobra, cambios acordados): queda registrado en el historial.
  if (b.accion === "notas") {
    const id = Number(b.id);
    if (!id || typeof b.notas !== "string") return NextResponse.json({ error: "Faltan id y notas" }, { status: 400 });
    const o = await prisma.order.findUnique({ where: { id } });
    if (!o) return NextResponse.json({ error: "No existe el pedido" }, { status: 404 });
    await prisma.$transaction([
      prisma.order.update({ where: { id }, data: { notas: b.notas.slice(0, 1000) } }),
      prisma.orderEvent.create({ data: { orderId: id, estado: o.estado, nota: `Notas corregidas${b.nota ? `: ${b.nota.slice(0, 200)}` : ""}` } }),
    ]);
    return NextResponse.json({ ok: true });
  }
  if (b.accion !== "estado") return NextResponse.json({ error: "accion = estado | notas" }, { status: 400 });
  const id = Number(b.id);
  if (!id || !b.estado) return NextResponse.json({ error: "Faltan id y estado" }, { status: 400 });
  try {
    await aplicarEstadoPedido(id, b.estado as EstadoPedido, { nota: b.nota?.slice(0, 300) ?? null, silencioso: !!b.silencioso });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 400 });
  }
}
