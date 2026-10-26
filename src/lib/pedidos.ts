import { randomBytes } from "node:crypto";
import type { MedioPago, Order } from "@prisma/client";
import { prisma } from "./prisma";
import { enviarComprobante, urlComprobante } from "./comprobante-envio";
import { leerConfig, type Config } from "./config";
import { pesos, precioVenta, redondear2 } from "./precios";
import { cotizarCarrito, estaPublicado, comboVigente, sanearLineas, type Cotizacion } from "./tienda";
import { armarBultos, PESO_POR_DEFECTO_G } from "./envios/bultos";
import { cotizarEnvio } from "./envios/cotizar";
import { cpEnLista, normalizarCp, zonaDeProvincia } from "./envios/geo";
import type { Bulto, OpcionEnvio } from "./envios/tipos";
import { enviarEmail, escaparHtml } from "./email";
import { SITIO, urlSitio } from "./sitio";
import { linkSeguimiento } from "./envios/seguimiento";
import { ErrorPedido, envioQueSeCobra, listaDeCompra, NOMBRE_MEDIO, numeroPedido, validarCliente } from "./pedido-calculos";
import { beneficioRecomendacion } from "./recomendacion-db";
import { ORDEN_PROVEEDORES, PROVEEDORES, proveedorDe } from "./proveedores";

export * from "./pedido-calculos";


// ---------- Carrito → renglones del pedido ----------

// Renglon y aItemDePedido viven en pedido-calculos (sin base de datos) y ya salen por el `export *` de arriba.
import { aItemDePedido, type Renglon } from "./pedido-calculos";

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


export type EnvioPreparado ={ cotizacion: Cotizacion; renglones: Renglon[]; bultos: Bulto[]; pesoTotalG: number; unidadesSinPeso: number; opciones: OpcionEnvio[] };

/** Cotiza carrito y envío juntos. Lo usan el checkout (para mostrar) y la creación del pedido (para cobrar). */
export async function prepararEnvio(entrada: unknown, cpCrudo: string, provincia: string, cfg?: Config): Promise<EnvioPreparado> {
  const c = cfg ?? (await leerConfig());
  const cp = normalizarCp(cpCrudo);
  if (!cp) throw new ErrorPedido("Revisá el código postal (4 números)");
  if (!zonaDeProvincia(provincia)) throw new ErrorPedido("Elegí la provincia");
  // En la zona de reparto propio (sin cargo) la compra mínima es más baja.
  const minimo = c.entregaPropiaActiva && cpEnLista(cp, c.cpEntregaPropia) ? Math.min(c.compraMinimaPropia, c.compraMinima) : c.compraMinima;
  const [cotizacion, renglones] = await Promise.all([cotizarCarrito(entrada, minimo), expandirCarrito(entrada, c)]);
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

export function totales(subtotal: number, envio: number, medioPago: MedioPago, cfg: Config, extraPct = 0, envioFijo = false) {
  // El extra es el beneficio por recomendación: se suma al de transferencia, sobre los productos.
  const descuento = redondear2((medioPago === "TRANSFERENCIA" ? (subtotal * cfg.descuentoTransferenciaPct) / 100 : 0) + (subtotal * extraPct) / 100);
  // Con tarjeta el envío va con la comisión adentro; por transferencia sale lo que cuesta.
  const envioCobrado = envioQueSeCobra(envio, medioPago, cfg.comisionPagoPct, envioFijo);
  const total = redondear2(subtotal - descuento + envioCobrado);
  const comisionPago = medioPago === "MERCADOPAGO" ? redondear2((total * cfg.comisionPagoPct) / 100) : 0;
  return { descuento, envioCobrado, total, comisionPago };
}

// ---------- Alta ----------

/** Por SQL directo: el cliente de Prisma puede ser anterior a la columna. Si falla, el pedido sigue igual. */
async function guardarOrigen(id: number, origen: string): Promise<void> {
  await prisma.$executeRaw`UPDATE "Order" SET "origen" = ${origen} WHERE "id" = ${id}`.catch((e) => console.error("origen del pedido", e));
}

export async function crearPedido(args: { lineas?: unknown; cliente?: unknown; envioOpcionId?: unknown; medioPago?: unknown; origen?: unknown; mpDisponible: boolean }): Promise<Order> {
  const cliente = validarCliente(args.cliente);
  const medioPago = args.medioPago === "MERCADOPAGO" || args.medioPago === "TRANSFERENCIA" ? args.medioPago : null;
  if (!medioPago) throw new ErrorPedido("Elegí cómo querés pagar");
  if (medioPago === "MERCADOPAGO" && !args.mpDisponible) throw new ErrorPedido("Mercado Pago no está disponible en este momento. Elegí transferencia.");
  const cfg = await leerConfig();
  const prep = await prepararEnvio(args.lineas, cliente.cp, cliente.provincia, cfg);
  if (!prep.cotizacion.puedePagar) throw new ErrorPedido(`El pedido no llega a la compra mínima de ${pesos(prep.cotizacion.compraMinima)} para tu zona`);
  const opcion = prep.opciones.find((o) => o.id === args.envioOpcionId);
  if (!opcion) throw new ErrorPedido("Esa opción de envío ya no está disponible. Volvé a elegir el envío.");

  const subtotal = prep.cotizacion.subtotal;
  const origenCrudo = typeof args.origen === "string" ? args.origen : "";
  const beneficio = await beneficioRecomendacion({ telefono: cliente.telefono, email: cliente.email, origen: origenCrudo }).catch(() => null);
  const { descuento, envioCobrado, total, comisionPago } = totales(subtotal, opcion.precio, medioPago, cfg, beneficio?.pct ?? 0, opcion.modalidad === "propia");
  const pedido = await prisma.order.create({
    data: {
      token: randomBytes(18).toString("base64url"),
      medioPago,
      ...cliente,
      subtotal,
      descuento,
      envioCobrado,
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
      items: { create: prep.renglones.map(aItemDePedido) },
      eventos: { create: { estado: "PENDIENTE_PAGO", nota: "Pedido recibido" } },
    },
  });
  const origenWeb = origenCrudo.trim() ? origenCrudo.replace(/[^\p{L}\p{N} ./:·_()>→-]/gu, "").slice(0, 200) : "web · directo";
  // La marca del beneficio va al final para que no se corte y el premio no se pueda usar dos veces.
  await guardarOrigen(pedido.id, beneficio?.marca ? `${origenWeb.slice(0, 170)} · ${beneficio.marca}` : origenWeb);
  await avisarPedidoRecibido(pedido, cfg);
  await avisarVenta(pedido, "Nueva venta en la web").catch((e) => console.error("aviso de venta web falló", e));
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
    await avisarVenta(pedido, "Pago confirmado").catch((e) => console.error("aviso de pago falló", e));
    const comprobante = urlComprobante(pedido.token);
    await enviarComprobante(pedido).catch((e) => console.error("comprobante por WhatsApp falló", e));
    if (pedido.email) await enviarEmail({
      para: pedido.email,
      asunto: `Recibimos tu pago · Pedido ${numeroPedido(pedido.id)}`,
      html: plantilla(`¡Gracias, ${escaparHtml(pedido.nombre)}!`, `<p>Confirmamos el pago de tu pedido <b>${numeroPedido(pedido.id)}</b> por <b>${pesos(Number(pedido.total))}</b>. Ya lo estamos preparando.</p><p><a href="${comprobante}">Ver tu comprobante de pago</a></p>`, pedido.token),
      responderA: (await leerConfig()).emailContacto,
    });
  }
  return confirmado;
}

/**
 * Pago registrado con el pedido ya en marcha (preparado, enviado): marca la fecha de pago, suma vendidos
 * y le manda el comprobante, sin cambiar el estado del pedido.
 */
export async function registrarPago(orderId: number, nota: string, { avisarCliente = true }: { avisarCliente?: boolean } = {}): Promise<boolean> {
  const hecho = await prisma.$transaction(async (tx) => {
    const r = await tx.order.updateMany({ where: { id: orderId, pagadoAt: null }, data: { pagadoAt: new Date() } });
    if (r.count === 0) return false;
    await tx.orderEvent.create({ data: { orderId, estado: "PAGADO", nota } });
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const i of items) await tx.product.updateMany({ where: { codigo: i.codigo }, data: { vendidos: { increment: i.cantidad } } });
    return true;
  });
  if (hecho) {
    const pedido = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    await avisarVenta(pedido, "Pago registrado").catch((e) => console.error("aviso de pago falló", e));
    // «Silencioso» (Santiago lo pidió así): se registra sin mandarle nada al cliente.
    if (avisarCliente) await enviarComprobante(pedido).catch((e) => console.error("comprobante por WhatsApp falló", e));
  }
  return hecho;
}

/**
 * Pago al recibir: se cobra en mano al entregar. Registra el cobro (fecha, vendidos y aviso interno)
 * sin mandarle al cliente «recibimos tu pago»: ya lo sabe, nos pagó en la puerta.
 */
export async function registrarCobroAlRecibir(orderId: number, nota: string): Promise<boolean> {
  const hecho = await prisma.$transaction(async (tx) => {
    const r = await tx.order.updateMany({ where: { id: orderId, pagadoAt: null }, data: { pagadoAt: new Date() } });
    if (r.count === 0) return false;
    await tx.orderEvent.create({ data: { orderId, estado: "PAGADO", nota } });
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const i of items) await tx.product.updateMany({ where: { codigo: i.codigo }, data: { vendidos: { increment: i.cantidad } } });
    return true;
  });
  if (hecho) {
    const pedido = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    await avisarVenta(pedido, "Cobrado al entregar").catch((e) => console.error("aviso de cobro falló", e));
  }
  return hecho;
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
}


/**
 * Aviso al cliente cuando el pedido sale.
 * El número de seguimiento solo sirve si llega a quien espera el paquete: en el panel no lo ve nadie.
 */
export async function avisarDespachado(orderId: number): Promise<boolean> {
  const [pedido, cfg] = await Promise.all([prisma.order.findUnique({ where: { id: orderId } }), leerConfig()]);
  if (!pedido) return false;
  const rastreo = linkSeguimiento(cfg.tabla.correo, pedido.tracking);
  const seguimiento = pedido.tracking
    ? `<p>Número de seguimiento: <b>${escaparHtml(pedido.tracking)}</b>${rastreo ? ` · <a href="${rastreo}">seguí tu envío</a>` : ""}</p>`
    : "";
  return enviarEmail({
    para: pedido.email,
    asunto: `Tu pedido ${numeroPedido(pedido.id)} ya salió`,
    html: plantilla(
      `Tu pedido ${numeroPedido(pedido.id)} está en camino`,
      `<p>Lo despachamos por <b>${escaparHtml(pedido.envioNombre)}</b>.${pedido.envioPlazo ? ` ${escaparHtml(pedido.envioPlazo)}.` : ""}</p>${seguimiento}`,
      pedido.token,
    ),
    responderA: cfg.emailContacto,
  });
}

// ---------- Pedidos que se cierran por WhatsApp ----------

/** Lo que falta saber para entregar: se pide en la charla y se completa después. */
export const A_CONFIRMAR = "A confirmar por WhatsApp";


/**
 * Una venta cerrada en el chat pasa a ser un pedido como los de la web: con número, productos,
 * costo, envío y lista de compra a Distrimay. Así se prepara y se entrega desde el mismo panel.
 */
export async function crearPedidoWhatsapp(a: {
  lineas: unknown;
  medioPago: "TRANSFERENCIA" | "AL_RECIBIR";
  nombre: string;
  telefono: string;
  envio: { lugar: string; costo: number | null };
}): Promise<Order> {
  const cfg = await leerConfig();
  const [cotizacion, renglones] = await Promise.all([cotizarCarrito(a.lineas), expandirCarrito(a.lineas, cfg)]);
  if (!renglones.length) throw new ErrorPedido("El pedido está vacío");
  const bultos = armarBultos(renglones.map((r) => ({ pesoG: r.pesoG ?? PESO_POR_DEFECTO_G, cantidad: r.cantidad })));
  const envio = a.envio.costo ?? 0;
  const { descuento, envioCobrado, total, comisionPago } = totales(cotizacion.subtotal, envio, a.medioPago, cfg);
  const propia = a.envio.costo !== null && (a.envio.costo === 0 || a.medioPago === "AL_RECIBIR");
  const charla = await prisma.$queryRaw<{ anuncioTitulo: string | null; prospecto: string | null }[]>`SELECT "anuncioTitulo", "prospecto" FROM "WhatsappConversacion" WHERE "telefono" = ${a.telefono}`;
  const origen = charla[0]?.prospecto ? `whatsapp · prospección: ${charla[0].prospecto}` : charla[0]?.anuncioTitulo ? `whatsapp · anuncio: ${charla[0].anuncioTitulo}` : "whatsapp";
  const pedido = await prisma.order.create({
    data: {
      token: randomBytes(18).toString("base64url"),
      medioPago: a.medioPago,
      nombre: a.nombre.slice(0, 120) || "Cliente de WhatsApp",
      email: "",
      telefono: a.telefono,
      calle: A_CONFIRMAR,
      ciudad: a.envio.lugar.slice(0, 100),
      provincia: "Córdoba",
      cp: "",
      notas: "Venta por WhatsApp",
      subtotal: cotizacion.subtotal,
      descuento,
      envioCobrado,
      total,
      costoProductos: redondear2(renglones.reduce((s, r) => s + r.costoUnitario * r.cantidad, 0)),
      costoEnvioReal: envio,
      comisionPago,
      costoPackaging: redondear2(cfg.costoPackaging),
      envioOpcionId: propia ? "propia" : "whatsapp",
      envioNombre: propia ? (envio === 0 ? "Entrega propia sin cargo" : "Entrega propia") : "Envío a coordinar",
      envioPlazo: propia ? cfg.plazoEntregaPropia : null,
      envioOrigen: propia ? "propia" : "tabla",
      pesoTotalG: bultos.reduce((s, b) => s + b.pesoG, 0),
      bultos: bultos.length,
      items: { create: renglones.map(aItemDePedido) },
      eventos: { create: { estado: "PENDIENTE_PAGO", nota: `Venta por WhatsApp · ${NOMBRE_MEDIO[a.medioPago]}` } },
    },
  });
  await guardarOrigen(pedido.id, origen.slice(0, 200));
  await avisarVenta(pedido, "Nueva venta por WhatsApp");
  return pedido;
}

/** Completa nombre, dirección y horario cuando la persona los pasa en la charla. */
export async function completarEntrega(orderId: number, d: { nombre?: string; direccion?: string; horario?: string; referencia?: string }): Promise<Order | null> {
  const pedido = await prisma.order.findUnique({ where: { id: orderId } });
  if (!pedido) return null;
  const notas = [d.horario ? `Horario: ${d.horario}` : "", d.referencia ? `Referencia: ${d.referencia}` : "", pedido.notas ?? ""].filter(Boolean).join(" · ").slice(0, 500);
  const actualizado = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...(d.nombre ? { nombre: d.nombre.slice(0, 120) } : {}),
      ...(d.direccion ? { calle: d.direccion.slice(0, 160) } : {}),
      notas,
    },
  });
  await avisarVenta(actualizado, "Datos de entrega");
  return actualizado;
}

/** Aviso a Santiago con todo lo de la venta en limpio. */
export async function avisarVenta(pedido: Order, titulo: string): Promise<void> {
  const items = await prisma.orderItem.findMany({ where: { orderId: pedido.id } });
  const productos = items.map((i) => `• ${i.cantidad} × ${i.producto} ${i.presentacion}`).join("\n");
  const texto = [
    `🛒 ${titulo} · ${numeroPedido(pedido.id)}`,
    `${pedido.nombre} · ${pedido.telefono}`,
    `${pedido.calle}, ${pedido.ciudad}`,
    pedido.notas ?? "",
    `${NOMBRE_MEDIO[pedido.medioPago]} · ${pesos(Number(pedido.total))} · ${pedido.envioNombre}`,
    productos,
    `${urlSitio()}/admin/pedidos/${pedido.id}`,
  ]
    .filter(Boolean)
    .join("\n");
  const { avisarSantiago } = await import("./avisos");
  await avisarSantiago(`${titulo} ${numeroPedido(pedido.id)} · ${pesos(Number(pedido.total))}`, texto);
}

// ---------- Compra a Distrimay ----------

/**
 * Los pedidos cuya mercadería todavía hay que comprar: pagados, o por transferencia / al recibir
 * (ya son ventas), y que no se marcaron como comprados. Con «Ya lo compré» salen de la lista.
 */
export async function pedidosPorComprar() {
  const sinComprar = await prisma.$queryRaw<{ id: number }[]>`
    SELECT "id" FROM "Order"
    WHERE "compradoAt" IS NULL
      AND ("estado" = 'PAGADO' OR ("estado" = 'PENDIENTE_PAGO' AND "medioPago" IN ('TRANSFERENCIA', 'AL_RECIBIR')))
  `;
  if (!sinComprar.length) return [];
  return prisma.order.findMany({ where: { id: { in: sinComprar.map((f) => f.id) } }, include: { items: true }, orderBy: { createdAt: "asc" } });
}

/** Marca como comprados: salen de la lista; los pagados pasan a «En compra al proveedor». */
export async function marcarComprados(ids: number[]): Promise<number> {
  if (!ids.length) return 0;
  const pedidos = await prisma.order.findMany({ where: { id: { in: ids } } });
  for (const p of pedidos) {
    await prisma.$executeRaw`UPDATE "Order" SET "compradoAt" = now() WHERE "id" = ${p.id}`;
    if (p.estado === "PAGADO") await prisma.order.update({ where: { id: p.id }, data: { estado: "EN_COMPRA" } });
    await prisma.orderEvent.create({ data: { orderId: p.id, estado: p.estado === "PAGADO" ? "EN_COMPRA" : p.estado, nota: "Mercadería comprada" } });
  }
  return pedidos.length;
}

/**
 * Cambia un producto del pedido por otro (porque el de Distrimay se quedó sin stock). El cliente
 * paga lo mismo: cambia lo que se compra y su costo, no el precio que ya aceptó.
 */
export async function reemplazarProducto(orderId: number, codigoViejo: string, codigoNuevo: string): Promise<string> {
  const nuevo = await prisma.product.findUnique({ where: { codigo: codigoNuevo } });
  if (!nuevo) throw new ErrorPedido(`No existe el código ${codigoNuevo}`);
  const items = await prisma.orderItem.findMany({ where: { orderId, codigo: codigoViejo } });
  if (!items.length) throw new ErrorPedido(`El pedido no tiene el código ${codigoViejo}`);
  await prisma.$transaction([
    prisma.orderItem.updateMany({ where: { orderId, codigo: codigoViejo }, data: { codigo: nuevo.codigo, producto: nuevo.producto, presentacion: nuevo.presentacion, costoUnitario: nuevo.costo } }),
    prisma.orderEvent.create({ data: { orderId, estado: (await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).estado, nota: `Reemplazo: ${items[0].producto} (${codigoViejo}) → ${nuevo.producto} (${nuevo.codigo})` } }),
  ]);
  const todos = await prisma.orderItem.findMany({ where: { orderId } });
  await prisma.order.update({ where: { id: orderId }, data: { costoProductos: redondear2(todos.reduce((s, i) => s + Number(i.costoUnitario) * i.cantidad, 0)) } });
  return `${items[0].producto} → ${nuevo.producto}`;
}

/** La compra partida por proveedor: a quién se le compra cada renglón, con su total. */
export async function compraPorProveedor(items: Parameters<typeof listaDeCompra>[0]) {
  const { renglones } = listaDeCompra(items);
  const marcas = new Map(
    (await prisma.product.findMany({ where: { codigo: { in: renglones.map((r) => r.codigo) } }, select: { codigo: true, marca: true } })).map((p) => [p.codigo, p.marca]),
  );
  return ORDEN_PROVEEDORES.map((id) => {
    const suyos = renglones.filter((r) => proveedorDe({ producto: r.producto, marca: marcas.get(r.codigo), codigo: r.codigo }) === id);
    return { proveedor: PROVEEDORES[id], renglones: suyos, total: redondear2(suyos.reduce((s, r) => s + r.total, 0)) };
  }).filter((g) => g.renglones.length);
}
