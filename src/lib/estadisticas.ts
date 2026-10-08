// Agregados de ventas y márgenes. Funciones puras sobre pedidos ya leídos.

import { margenNeto } from "./pedido-calculos";

const redondear2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const ESTADOS_VENTA = ["PAGADO", "EN_COMPRA", "PREPARADO", "ENVIADO", "ENTREGADO"] as const;

type Num = number | { toString(): string };
export type PedidoStats = {
  createdAt: Date;
  subtotal: Num; descuento: Num; envioCobrado: Num; total: Num; costoProductos: Num; costoEnvioReal: Num; comisionPago: Num; costoPackaging: Num;
  items: { codigo: string; producto: string; presentacion: string; cantidad: number; precioUnitario: Num; costoUnitario: Num; comboSlug: string | null }[];
};
export type FilaRanking = { clave: string; nombre: string; unidades: number; ventas: number; margen: number };

const dia = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });

export function resumir(pedidos: PedidoStats[], nichosPorCodigo: Map<string, string[]>, nombres: { nichos: Map<string, string>; combos: Map<string, string> }) {
  let ventas = 0, bruto = 0, neto = 0, subsidio = 0, comisiones = 0, packaging = 0, descuentos = 0;
  const porDia = new Map<string, { ventas: number; pedidos: number }>();
  const productos = new Map<string, FilaRanking>();
  const combos = new Map<string, FilaRanking>();
  const nichos = new Map<string, FilaRanking>();
  const sumar = (m: Map<string, FilaRanking>, clave: string, nombre: string, unidades: number, v: number, mg: number) => {
    const f = m.get(clave) ?? { clave, nombre, unidades: 0, ventas: 0, margen: 0 };
    f.unidades += unidades;
    f.ventas += v;
    f.margen += mg;
    m.set(clave, f);
  };
  for (const p of pedidos) {
    const m = margenNeto(p as never);
    ventas += m.venta;
    bruto += m.bruto;
    neto += m.neto;
    subsidio += m.subsidioEnvio;
    comisiones += Number(p.comisionPago);
    packaging += Number(p.costoPackaging);
    descuentos += Number(p.descuento);
    const d = porDia.get(dia(p.createdAt)) ?? { ventas: 0, pedidos: 0 };
    d.ventas += m.venta;
    d.pedidos++;
    porDia.set(dia(p.createdAt), d);
    for (const i of p.items) {
      const v = Number(i.precioUnitario) * i.cantidad;
      const mg = (Number(i.precioUnitario) - Number(i.costoUnitario)) * i.cantidad;
      sumar(productos, i.codigo, `${i.producto} ${i.presentacion}`.trim(), i.cantidad, v, mg);
      if (i.comboSlug) sumar(combos, i.comboSlug, nombres.combos.get(i.comboSlug) ?? i.comboSlug, i.cantidad, v, mg);
      // Un producto puede estar en varios nichos: su margen cuenta en cada uno (los nichos no suman el total).
      for (const n of nichosPorCodigo.get(i.codigo) ?? []) sumar(nichos, n, nombres.nichos.get(n) ?? n, i.cantidad, v, mg);
    }
  }
  const ranking = (m: Map<string, FilaRanking>) => [...m.values()].map((f) => ({ ...f, ventas: redondear2(f.ventas), margen: redondear2(f.margen) })).sort((a, b) => b.margen - a.margen);
  const n = pedidos.length;
  return {
    pedidos: n,
    ventas: redondear2(ventas),
    ticketPromedio: n ? redondear2(ventas / n) : 0,
    margenBruto: redondear2(bruto),
    margenBrutoPct: ventas > 0 ? redondear2((bruto / ventas) * 100) : 0,
    margenNeto: redondear2(neto),
    margenNetoPct: ventas > 0 ? redondear2((neto / ventas) * 100) : 0,
    subsidioEnvio: redondear2(subsidio),
    comisiones: redondear2(comisiones),
    packaging: redondear2(packaging),
    descuentos: redondear2(descuentos),
    porDia,
    productos: ranking(productos),
    combos: ranking(combos),
    nichos: ranking(nichos),
  };
}

/** Serie diaria continua (días sin ventas en cero) entre dos fechas locales AAAA-MM-DD. */
export function serieDiaria(porDia: Map<string, { ventas: number; pedidos: number }>, desde: string, hasta: string) {
  const out: { dia: string; ventas: number; pedidos: number }[] = [];
  const fin = new Date(`${hasta}T12:00:00Z`);
  for (let d = new Date(`${desde}T12:00:00Z`); d <= fin && out.length < 400; d.setUTCDate(d.getUTCDate() + 1)) {
    const k = d.toISOString().slice(0, 10);
    out.push({ dia: k, ventas: redondear2(porDia.get(k)?.ventas ?? 0), pedidos: porDia.get(k)?.pedidos ?? 0 });
  }
  return out;
}
