import { randomBytes } from "node:crypto";
import type { MedioPago, Order } from "@prisma/client";
import { prisma } from "./prisma";
import { leerConfig, type Config } from "./config";
import { pesos, precioVenta, redondear2 } from "./precios";
import { cotizarCarrito, estaPublicado, comboVigente, sanearLineas, type Cotizacion } from "./tienda";
import { armarBultos, PESO_POR_DEFECTO_G } from "./envios/bultos";
import { cotizarEnvio } from "./envios/cotizar";
import { normalizarCp, zonaDeProvincia } from "./envios/geo";
import type { Bulto, OpcionEnvio } from "./envios/tipos";
import { enviarEmail, escaparHtml } from "./email";
import { SITIO, urlSitio } from "./sitio";
import { ErrorPedido, numeroPedido, validarCliente } from "./pedido-calculos";

export * from "./pedido-calculos";


// ---------- Carrito → renglones del pedido ----------

export type Renglon = { codigo: string; producto: string; presentacion: string; cantidad: number; precioUnitario: number; costoUnitario: number; pesoG: number | null; comboSlug: string | null; congelado?: boolean };

/** Abre productos y combos en renglones con precio y costo. Solo entra lo que hoy se vende. */
export async function expandirCarrito(entrada: unknown, cfg: Config): Promise<Renglon[]> {
  const lineas = sanearLineas(entrada);
  const codigos = lineas.filter((l) => l.tipo === "producto").map((l) => l.id);
  const slugs = lineas.filter((l) => l.tipo === "combo").map((l) => l.id);
  const [productos, combos] = await Promise.all([
    codigos.length ? prisma.product.findMany({ where: { codigo: { in: codigos } } }) : [],
    slugs.length ? prisma.combo.findMany({ where: { slug: { in: slugs }, tipo: "COMBO" }, include: { items: { include: { product: true } } } }) : [],
  ]);
  const porCodigo = new Map(productos.map((p) => [p.codigo, p]));
  const porSlug = new Map(combos.map((c) => [c.slug, c]));
  const out: Renglon[] = [];
  for (const l of lineas) {
    if (l.tipo === "producto") {
      const p = porCodigo.get(l.id);
      if (!p || !estaPublicado(p, cfg.margenMinimoPct)) continue;
      out.push({ codigo: p.codigo, producto: p.producto, presentacion: p.presentacion, cantidad: l.cantidad, precioUnitario: precioVenta(Number(p.precioPublico), cfg.recargoPrecioPct), costoUnitario: Number(p.costo), pesoG: p.pesoBrutoG, comboSlug: null, congelado: p.categoria === "Congelados" });
    } else {
      const c = porSlug.get(l.id);
      if (!c || !comboVigente(c) || !c.items.length || !c.items.every((i) => estaPublicado(i.product, cfg.margenMinimoPct))) continue;
      const factor = 1 - Number(c.descuentoPct) / 100;
      for (const i of c.items) {
        out.push({ codigo: i.codigo, producto: i.product.producto, presentacion: i.product.presentacion, cantidad: i.cantidad * l.cantidad, precioUnitario: redondear2(precioVenta(Number(i.product.precioPublico), cfg.recargoPrecioPct) * factor), costoUnitario: Number(i.product.costo), pesoG: i.product.pesoBrutoG, comboSlug: c.slug, congelado: i.product.categoria === "Congelados" });
      }
    }
  }
  return out;
}

export type EnvioPreparado = { cotizacion: Cotizacion; renglones: Renglon[]; bultos: Bulto[]; pesoTotalG: number; unidadesSinPeso: number; opciones: OpcionEnvio[] };

/** Cotiza carrito y envío juntos. Lo usan el checkout (para mostrar) y la creación del pedido (para cobrar). */
export async function prepararEnvio(entrada: unknown, cpCrudo: string, provincia: string, cfg?: Config): Promise<EnvioPreparado> {
  const c = cfg ?? (await leerConfig());
  const cp = normalizarCp(cpCrudo);
  if (!cp) throw new ErrorPedido("Revisá el código postal (4 números)");
  if (!zonaDeProvincia(provincia)) throw new ErrorPedido("Elegí la provincia");
  const [cotizacion, renglones] = await Promise.all([cotizarCarrito(entrada), expandirCarrito(entrada, c)]);
  if (!renglones.length) throw new ErrorPedido("Tu carrito está vacío");
  const bultos = armarBultos(renglones.map((r) => ({ pesoG: r.pesoG ?? PESO_POR_DEFECTO_G, cantidad: r.cantidad })));
  const todas = await cotizarEnvio(
    { cpOrigen: c.cpOrigen, entregaPropiaActiva: c.entregaPropiaActiva, cpEntregaPropia: c.cpEntregaPropia, plazoEntregaPropia: c.plazoEntregaPropia, envioGratisDesde: c.envioGratisDesde, tabla: c.tabla },
    { cpDestino: cp, provincia, bultos, subtotal: cotizacion.subtotal },
  );
  // Los congelados necesitan cadena de frío: solo viajan en el reparto propio, nunca por correo.
  const congelados = [...new Set(renglones.filter((r) => r.congelado).map((r) => r.producto))];
  const opciones = congelados.length ? todas.filter((o) => o.modalidad === "propia") : todas;
  if (!opciones.length) throw new ErrorPedido(`Los congelados solo se entregan en Villa Carlos Paz y el sur de Punilla. Para enviar a tu zona, quitá del carrito: ${congelados.join(", ")}.`);
  return {
    cotizacion,
    renglones,
    bultos,
    pesoTotalG: bultos.reduce((s, b) => s + b.pesoG, 0),
    unidadesSinPeso: renglones.filter((r) => r.pesoG === null).reduce((s, r) => s + r.cantidad, 0),
    opciones,
  };
}

export function totales(subtotal: number, envio: number, medioPago: MedioPago, cfg: Config) {
  const descuento = medioPago === "TRANSFERENCIA" ? redondear2((subtotal * cfg.descuentoTransferenciaPct) / 100) : 0;
  const total = redondear2(subtotal - descuento + envio);
  const comisionPago = medioPago === "MERCADOPAGO" ? redondear2((total * cfg.comisionPagoPct) / 100) : 0;
  return { descuento, total, comisionPago };
}

// ---------- Alta ----------

export async function crearPedido(args: { lineas?: unknown; cliente?: unknown; envioOpcionId?: unknown; medioPago?: unknown; mpDisponible: boolean }): Promise<Order> {
  const cliente = validarCliente(args.cliente);
  const medioPago = args.medioPago === "MERCADOPAGO" || args.medioPago === "TRANSFERENCIA" ? args.medioPago : null;
  if (!medioPago) throw new ErrorPedido("Elegí cómo querés pagar");
  if (medioPago === "MERCADOPAGO" && !args.mpDisponible) throw new ErrorPedido("Mercado Pago no está disponible en este momento. Elegí transferencia.");
  const cfg = await leerConfig();
  const prep = await prepararEnvio(args.lineas, cliente.cp, cliente.provincia, cfg);
  if (!prep.cotizacion.puedePagar) throw new ErrorPedido(`El pedido no llega a la compra mínima de ${pesos(cfg.compraMinima)}`);
  const opcion = prep.opciones.find((o) => o.id === args.envioOpcionId);
  if (!opcion) throw new ErrorPedido("Esa opción de envío ya no está disponible. Volvé a elegir el envío.");

  const subtotal = prep.cotizacion.subtotal;
  const { descuento, total, comisionPago } = totales(subtotal, opcion.precio, medioPago, cfg);
  const pedido = await prisma.order.create({
    data: {
      token: randomBytes(18).toString("base64url"),
      medioPago,
      ...cliente,
      subtotal,
      descuento,
      envioCobrado: opcion.precio,
      total,
      costoProductos: redondear2(prep.renglones.reduce((s, r) => s + r.costoUnitario * r.cantidad, 0)),
      costoEnvioReal: opcion.costo,
      comisionPago,
      costoPackaging: redondear2(cfg.costoPackaging * (opcion.modalidad === "propia" ? 1 : prep.bultos.length)),
      envioOpcionId: opcion.id,
      envioNombre: opcion.nombre,
      envioPlazo: opcion.plazo,
      envioOrigen: opcion.proveedor,
      pesoTotalG: prep.pesoTotalG,
      bultos: prep.bultos.length,
      items: { create: prep.renglones.map(({ pesoG: _peso, ...r }) => r) },
      eventos: { create: { estado: "PENDIENTE_PAGO", nota: "Pedido recibido" } },
    },
  });
  await avisarPedidoRecibido(pedido, cfg);
  return pedido;
}

// ---------- Pago y estados ----------

/** Idempotente: si el pedido ya no está pendiente, no hace nada. */
export async function confirmarPago(orderId: number, nota: string, mpPaymentId?: string): Promise<boolean> {
  const confirmado = await prisma.$transaction(async (tx) => {
    const r = await tx.order.updateMany({ where: { id: orderId, estado: "PENDIENTE_PAGO" }, data: { estado: "PAGADO", pagadoAt: new Date(), mpPaymentId } });
    if (r.count === 0) return false;
    await tx.orderEvent.create({ data: { orderId, estado: "PAGADO", nota } });
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const i of items) await tx.product.updateMany({ where: { codigo: i.codigo }, data: { vendidos: { increment: i.cantidad } } });
    return true;
  });
  if (confirmado) {
    const pedido = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    await enviarEmail({
      para: pedido.email,
      asunto: `Recibimos tu pago · Pedido ${numeroPedido(pedido.id)}`,
      html: plantilla(`¡Gracias, ${escaparHtml(pedido.nombre)}!`, `<p>Confirmamos el pago de tu pedido <b>${numeroPedido(pedido.id)}</b> por <b>${pesos(Number(pedido.total))}</b>. Ya lo estamos preparando.</p>`, pedido.token),
      responderA: (await leerConfig()).emailContacto,
    });
  }
  return confirmado;
}

/** Consulta un pago en Mercado Pago y, si está aprobado y coincide con el pedido, lo confirma. */
export async function procesarPagoMp(pago: { id: number; status: string; external_reference: string | null; transaction_amount: number; currency_id: string }): Promise<"confirmado" | "ignorado"> {
  if (pago.status !== "approved" || !pago.external_reference) return "ignorado";
  const pedido = await prisma.order.findUnique({ where: { token: pago.external_reference } });
  if (!pedido || pedido.medioPago !== "MERCADOPAGO") return "ignorado";
  if (pago.currency_id !== "ARS" || pago.transaction_amount + 0.01 < Number(pedido.total)) {
    console.error(`Mercado Pago: el pago ${pago.id} no coincide con el pedido ${pedido.id}`);
    return "ignorado";
  }
  await confirmarPago(pedido.id, `Pago aprobado en Mercado Pago (${pago.id})`, String(pago.id));
  return "confirmado";
}

// ---------- Avisos ----------

function plantilla(titulo: string, cuerpo: string, token: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#1c1917"><h2 style="color:#3a5124">${titulo}</h2>${cuerpo}<p><a href="${urlSitio()}/pedido/${token}">Ver el estado de tu pedido</a></p><p style="color:#78716c;font-size:13px">${SITIO.nombre} · ${SITIO.base}</p></div>`;
}

async function avisarPedidoRecibido(pedido: Order, cfg: Config) {
  const items = await prisma.orderItem.findMany({ where: { orderId: pedido.id } });
  const filas = items.map((i) => `<li>${i.cantidad} × ${escaparHtml(i.producto)} <span style="color:#78716c">${escaparHtml(i.presentacion)}</span></li>`).join("");
  const pago =
    pedido.medioPago === "TRANSFERENCIA"
      ? `<p>Para confirmarlo, transferí <b>${pesos(Number(pedido.total))}</b>${cfg.transferenciaDatos ? ` a:</p><pre style="background:#f3ebdd;padding:12px;border-radius:8px;white-space:pre-wrap">${escaparHtml(cfg.transferenciaDatos)}</pre>` : ". Te pasamos los datos de la cuenta por WhatsApp.</p>"}`
      : `<p>Total: <b>${pesos(Number(pedido.total))}</b>. Si todavía no pagaste, podés hacerlo desde el enlace de abajo.</p>`;
  await enviarEmail({
    para: pedido.email,
    asunto: `Recibimos tu pedido ${numeroPedido(pedido.id)}`,
    html: plantilla(`Recibimos tu pedido ${numeroPedido(pedido.id)}`, `<ul>${filas}</ul><p>Envío: ${escaparHtml(pedido.envioNombre)}</p>${pago}`, pedido.token),
    responderA: cfg.emailContacto,
  });
  if (cfg.emailContacto) {
    await enviarEmail({
      para: cfg.emailContacto,
      asunto: `Nuevo pedido ${numeroPedido(pedido.id)} · ${pesos(Number(pedido.total))}`,
      html: `<p>${escaparHtml(pedido.nombre)} (${escaparHtml(pedido.telefono)}) · ${pedido.medioPago === "TRANSFERENCIA" ? "Transferencia" : "Mercado Pago"}</p><ul>${filas}</ul><p><a href="${urlSitio()}/admin/pedidos/${pedido.id}">Abrir en el panel</a></p>`,
    });
  }
}

