// Cálculos y validaciones de pedidos sin base de datos (testeables).

import type { EstadoPedido, Order, OrderItem } from "@prisma/client";
import { redondear2 } from "./precios";
import { normalizarCp, zonaDeProvincia } from "./envios/geo";

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
export function margenNeto(p: Pick<Order, "total" | "costoProductos" | "costoEnvioReal" | "comisionPago" | "costoPackaging" | "subtotal" | "descuento" | "envioCobrado">) {
  const venta = Number(p.subtotal) - Number(p.descuento);
  const bruto = redondear2(venta - Number(p.costoProductos));
  const subsidioEnvio = redondear2(Number(p.costoEnvioReal) - Number(p.envioCobrado));
  const neto = redondear2(bruto - subsidioEnvio - Number(p.comisionPago) - Number(p.costoPackaging));
  return { venta: redondear2(venta), bruto, brutoPct: venta > 0 ? redondear2((bruto / venta) * 100) : 0, subsidioEnvio, neto, netoPct: venta > 0 ? redondear2((neto / venta) * 100) : 0 };
}
