// Cálculos y validaciones de pedidos sin base de datos (testeables).

import type { EstadoPedido, Order, OrderItem } from "@prisma/client";
import { precioRedondo, redondear2 } from "./precios";
import { normalizarCp, zonaDeProvincia } from "./envios/geo";

/**
 * El envío que paga el cliente, según cómo paga.
 *
 * El precio de lista de los productos ya lleva el recargo que cubre la comisión de la tarjeta,
 * pero el envío no llevaba nada: Mercado Pago cobra su porcentaje sobre el total, envío incluido,
 * y esa parte salía del bolsillo nuestro. Con envíos de $35.000 eran casi $3.000 por pedido.
 *
 * Se divide, no se multiplica: para que después de que el pago se lleve su 8% queden los $35.000
 * del correo, hay que cobrar 35.000 / 0,92, no 35.000 × 1,08.
 */
export function envioQueSeCobra(envio: number, medioPago: "MERCADOPAGO" | "TRANSFERENCIA" | "AL_RECIBIR", comisionPagoPct: number, fijo = false): number {
  // La entrega propia (Carlos Paz gratis, Córdoba Capital $15.000) tiene precio fijo: se cobra eso, pague como pague.
  if (fijo || medioPago !== "MERCADOPAGO" || !(envio > 0)) return redondear2(envio);
  const pct = Math.min(Math.max(comisionPagoPct, 0), 95);
  // Correos: con la comisión adentro y redondo hacia arriba (nunca un envío de $ 16.304,35).
  return precioRedondo(envio / (1 - pct / 100), "arriba");
}

/** Una línea del pedido ya resuelta: incluye datos que solo sirven para calcular (peso, congelado). */
export type Renglon = { codigo: string; producto: string; presentacion: string; cantidad: number; precioUnitario: number; costoUnitario: number; pesoG: number | null; comboSlug: string | null; congelado?: boolean };

/**
 * El renglón, recortado a las columnas de OrderItem.
 * Campo por campo y no con spread: el spread le cuela a Prisma los campos de cálculo sin que
 * TypeScript lo vea, y Prisma rechaza la fila entera. Pasó con `congelado` y tiró el alta de
 * TODOS los pedidos. Si agregás un campo a Renglón, acá no entra salvo que lo pongas a mano.
 */
export function aItemDePedido(r: Renglon) {
  return {
    codigo: r.codigo,
    producto: r.producto,
    presentacion: r.presentacion,
    cantidad: r.cantidad,
    precioUnitario: r.precioUnitario,
    costoUnitario: r.costoUnitario,
    comboSlug: r.comboSlug,
  };
}

export const ESTADOS: { id: EstadoPedido; nombre: string }[] = [
  { id: "PENDIENTE_PAGO", nombre: "Pendiente de pago" },
  { id: "PAGADO", nombre: "Pagado" },
  { id: "EN_COMPRA", nombre: "En compra al proveedor" },
  { id: "PREPARADO", nombre: "Preparado" },
  { id: "ENVIADO", nombre: "Enviado" },
  { id: "ENTREGADO", nombre: "Entregado" },
  { id: "CANCELADO", nombre: "Cancelado" },
];
export const nombreEstado = (e: EstadoPedido) => ESTADOS.find((x) => x.id === e)?.nombre ?? e;
export const numeroPedido = (id: number) => `AS-${String(id).padStart(5, "0")}`;

/** wa.me necesita el número con código de país. Asume Argentina si no lo trae. */
export function linkWhatsapp(telefono: string, mensaje: string): string | null {
  let d = telefono.replace(/\D/g, "").replace(/^0+/, "");
  if (d.length < 8) return null;
  if (!d.startsWith("54")) d = `549${d}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(mensaje)}`;
}

// ---------- Datos del cliente ----------

export type DatosCliente = { nombre: string; email: string; telefono: string; calle: string; ciudad: string; provincia: string; cp: string; notas: string | null };

export class ErrorPedido extends Error {}

export function validarCliente(crudo: unknown): DatosCliente {
  const o = (crudo ?? {}) as Record<string, unknown>;
  const t = (k: string, max: number) => String(o[k] ?? "").trim().slice(0, max);
  const d = { nombre: t("nombre", 120), email: t("email", 160).toLowerCase(), telefono: t("telefono", 40), calle: t("calle", 160), ciudad: t("ciudad", 100), provincia: t("provincia", 60), notas: t("notas", 500) || null };
  if (d.nombre.length < 3) throw new ErrorPedido("Completá tu nombre y apellido");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) throw new ErrorPedido("Revisá el email");
  if (d.telefono.replace(/\D/g, "").length < 8) throw new ErrorPedido("Revisá el teléfono (con código de área)");
  if (d.calle.length < 4) throw new ErrorPedido("Completá la dirección de entrega");
  if (d.ciudad.length < 2) throw new ErrorPedido("Completá la localidad");
  if (!zonaDeProvincia(d.provincia)) throw new ErrorPedido("Elegí la provincia");
  const cp = normalizarCp(String(o.cp ?? ""));
  if (!cp) throw new ErrorPedido("Revisá el código postal (4 números)");
  return { ...d, cp };
}

// ---------- Lista de compra al proveedor ----------

export type RenglonCompra = { codigo: string; producto: string; presentacion: string; cantidad: number; costo: number; total: number };

/** Código, producto, cantidad, costo y total, agrupado por código (un producto puede venir suelto y dentro de un combo). */
export function listaDeCompra(items: Pick<OrderItem, "codigo" | "producto" | "presentacion" | "cantidad" | "costoUnitario">[]): { renglones: RenglonCompra[]; total: number } {
  const mapa = new Map<string, RenglonCompra>();
  for (const i of items) {
    const r = mapa.get(i.codigo) ?? { codigo: i.codigo, producto: i.producto, presentacion: i.presentacion, cantidad: 0, costo: Number(i.costoUnitario), total: 0 };
    r.cantidad += i.cantidad;
    r.total = redondear2(r.costo * r.cantidad);
    mapa.set(i.codigo, r);
  }
  const renglones = [...mapa.values()].sort((a, b) => a.producto.localeCompare(b.producto, "es"));
  return { renglones, total: redondear2(renglones.reduce((s, r) => s + r.total, 0)) };
}

/** Margen neto exacto del pedido: lo cobrado menos productos, envío real, comisión y packaging. */
/** Debajo de este porcentaje un pedido no paga el trabajo que cuesta prepararlo. */
export const MARGEN_FLACO_PCT = 10;

export function margenNeto(p: Pick<Order, "total" | "costoProductos" | "costoEnvioReal" | "comisionPago" | "costoPackaging" | "subtotal" | "descuento" | "envioCobrado">) {
  const venta = Number(p.subtotal) - Number(p.descuento);
  const bruto = redondear2(venta - Number(p.costoProductos));
  const subsidioEnvio = redondear2(Number(p.costoEnvioReal) - Number(p.envioCobrado));
  const neto = redondear2(bruto - subsidioEnvio - Number(p.comisionPago) - Number(p.costoPackaging));
  const netoPct = venta > 0 ? redondear2((neto / venta) * 100) : 0;
  // Un pedido que deja 1% no se ve mal en verde, y es trabajar gratis: pasó con el AS-00003.
  // La señal tiene que saltar sola, no depender de que alguien mire la columna.
  const alerta = neto < 0 ? "perdida" : netoPct < MARGEN_FLACO_PCT ? "flaco" : "ok";
  return { venta: redondear2(venta), bruto, brutoPct: venta > 0 ? redondear2((bruto / venta) * 100) : 0, subsidioEnvio, neto, netoPct, alerta };
}

/**
 * Si el pedido se le puede contar a Meta como compra.
 *
 * El Purchase viajaba con solo ver la página del pedido con `?nuevo=1`, y eso pasa dos veces
 * de más: cuando el cliente vuelve a abrir el link de su confirmación (mail, historial, WhatsApp)
 * y cuando Mercado Pago lo devuelve al sitio aunque la tarjeta haya sido rechazada — las tres
 * back_urls (success, pending, failure) apuntan al mismo lado. Resultado: Meta aprende a buscar
 * gente que no compra, con la plata del anuncio.
 *
 * Por transferencia el pedido alta es la compra: el cliente eligió, dejó sus datos y nos debe
 * la plata. Por tarjeta no: hasta que Mercado Pago no confirme, no hubo compra.
 */
export function compraReportable(estado: EstadoPedido, medioPago: "MERCADOPAGO" | "TRANSFERENCIA" | "AL_RECIBIR"): boolean {
  if (estado === "CANCELADO") return false;
  return medioPago !== "MERCADOPAGO" || estado !== "PENDIENTE_PAGO";
}

export const NOMBRE_MEDIO: Record<"MERCADOPAGO" | "TRANSFERENCIA" | "AL_RECIBIR", string> = {
  MERCADOPAGO: "Mercado Pago",
  TRANSFERENCIA: "Transferencia",
  AL_RECIBIR: "Paga al recibir",
};

/**
 * Suma horario y referencia a las notas sin repetir: el nuevo «Horario:» reemplaza al anterior, igual
 * «Referencia:», y nada se duplica (antes quedaba «Horario: … · Horario: … · Horario: …»).
 */
export function unirNotas(viejas: string | null, horario?: string, referencia?: string): string {
  const partes = (viejas ?? "").split(" · ").map((x) => x.trim()).filter(Boolean);
  const quedan = partes.filter((x) => !(horario && /^horario:/i.test(x)) && !(referencia && /^referencia:/i.test(x)));
  const todas = [horario ? `Horario: ${horario}` : "", referencia ? `Referencia: ${referencia}` : "", ...quedan].filter(Boolean);
  return [...new Set(todas)].join(" · ").slice(0, 500);
}

