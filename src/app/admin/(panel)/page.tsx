// «Hoy» (26/11, Santiago: «menos fricción, los datos claves, todo simple»): lo primero que se ve al abrir el panel es
// cómo viene el día y qué hay que hacer ya. El resumen del catálogo quedó abajo, plegado.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { VISTAS, whereVista } from "@/lib/filtros-producto";
import { pesos } from "@/lib/precios";

export const dynamic = "force-dynamic";

/** Medianoche de hoy en Córdoba (UTC-3), como fecha UTC. */
function inicioDeHoy(): Date {
  const ar = new Date(Date.now() - 3 * 3600_000);
  return new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate(), 3));
}

export default async function Hoy() {
  const cfg = await leerConfig();
  const desde = inicioDeHoy();
  const ayer = new Date(desde.getTime() - 86_400_000);
  const hace10 = new Date(Date.now() - 10 * 86_400_000);
  const [nuevos, nuevosAyer, paraEntregar, entregadosHoy, esperanTransferencia, enManos, conCambios] = await Promise.all([
    prisma.order.findMany({ where: { createdAt: { gte: desde }, estado: { not: "CANCELADO" } }, select: { total: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: ayer, lt: desde }, estado: { not: "CANCELADO" } }, select: { total: true } }),
    prisma.order.findMany({
      where: { envioOrigen: "propia", OR: [{ estado: { in: ["PAGADO", "EN_COMPRA", "PREPARADO", "ENVIADO"] }, createdAt: { gte: hace10 } }, { estado: "PENDIENTE_PAGO", medioPago: "AL_RECIBIR", createdAt: { gte: hace10 } }] },
      select: { total: true, pagadoAt: true },
    }),
    prisma.orderEvent.findMany({ where: { estado: "ENTREGADO", fecha: { gte: desde } }, select: { order: { select: { total: true } } } }),
    prisma.order.count({ where: { estado: "PENDIENTE_PAGO", medioPago: "TRANSFERENCIA", createdAt: { gte: hace10 } } }),
    prisma.whatsappConversacion.count({ where: { estado: "persona", ultimoMensaje: { gte: new Date(Date.now() - 24 * 3600_000) } } }),
    prisma.orderEvent.count({ where: { fecha: { gte: ayer }, nota: { contains: "CAMBIO A REVISAR" } } }),
  ]);
  const suma = (xs: { total: unknown }[]) => xs.reduce((s, x) => s + Number(x.total), 0);
  const aCobrar = paraEntregar.filter((p) => !p.pagadoAt).reduce((s, p) => s + Number(p.total), 0);
  const cobradoHoy = entregadosHoy.reduce((s, e) => s + Number(e.order.total), 0);
  const tarjeta = "tarjeta flex flex-col gap-1 hover:border-acopio-500";

  const conteos = await Promise.all(VISTAS.map((v) => prisma.product.count({ where: whereVista(v.id, cfg.margenMinimoPct) })));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hoy</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/admin/pedidos" className={tarjeta}>
          <span className="text-xs font-semibold uppercase text-stone-500">Ventas de hoy</span>
          <span className="text-2xl font-bold tabular-nums">{nuevos.length} · {pesos(suma(nuevos))}</span>
          <span className="text-xs text-stone-600">ayer {nuevosAyer.length} · {pesos(suma(nuevosAyer))}</span>
        </Link>
        <Link href="/admin/reparto" className={`${tarjeta} border-sol bg-sol-claro/40`}>
          <span className="text-xs font-semibold uppercase text-stone-500">🚚 Para entregar</span>
          <span className="text-2xl font-bold tabular-nums">{paraEntregar.length}</span>
          <span className="text-xs text-stone-600">a cobrar {pesos(aCobrar)}</span>
        </Link>
        <div className={tarjeta}>
          <span className="text-xs font-semibold uppercase text-stone-500">Entregado hoy</span>
          <span className="text-2xl font-bold tabular-nums">{entregadosHoy.length}</span>
          <span className="text-xs text-stone-600">{pesos(cobradoHoy)}</span>
        </div>
        <Link href="/admin/whatsapp" className={tarjeta}>
          <span className="text-xs font-semibold uppercase text-stone-500">💬 Te esperan</span>
          <span className="text-2xl font-bold tabular-nums">{enManos}</span>
          <span className="text-xs text-stone-600">charlas en manos de una persona</span>
        </Link>
      </div>

      {(esperanTransferencia > 0 || conCambios > 0) && (
        <div className="space-y-2">
          {esperanTransferencia > 0 && <Link href="/admin/pedidos?estado=PENDIENTE_PAGO" className="block rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">💸 {esperanTransferencia} pedido{esperanTransferencia === 1 ? "" : "s"} por transferencia sin confirmar: revisá el banco y marcalos pagados →</Link>}
          {conCambios > 0 && <Link href="/admin/reparto" className="block rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">⚠️ {conCambios} cambio{conCambios === 1 ? "" : "s"} de pedido para revisar antes del reparto →</Link>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link href="/admin/reparto" className="btn-comprar">🚚 Reparto</Link>
        <Link href="/admin/whatsapp" className="btn-whatsapp">💬 Mensajes</Link>
        <Link href="/admin/pedidos" className="btn">📦 Pedidos</Link>
        <Link href="/admin/pedidos/compras" className="btn-sec">🛒 Qué comprar</Link>
      </div>

      <details className="tarjeta">
        <summary className="cursor-pointer text-sm font-semibold">Catálogo · compra mínima {pesos(cfg.compraMinima)} · margen mínimo {cfg.margenMinimoPct}%</summary>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {VISTAS.map((v, i) => (
            <Link key={v.id} href={`/admin/productos?vista=${v.id}`} className="tarjeta hover:border-acopio-500">
              <div className="text-2xl font-semibold tabular-nums">{conteos[i]}</div>
              <div className="text-xs text-stone-600">{v.nombre}</div>
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}
