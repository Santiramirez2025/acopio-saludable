import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { comboVigente } from "@/lib/tienda";
import { calcularCombo, descuentoMaximo, pesos } from "@/lib/precios";

export default async function Combos({ searchParams }: { searchParams: Promise<{ eliminado?: string }> }) {
  const { eliminado } = await searchParams;
  const [combos, cfg] = await Promise.all([
    prisma.combo.findMany({ include: { items: { include: { product: true } } }, orderBy: [{ tipo: "asc" }, { id: "asc" }] }),
    leerConfig(),
  ]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Combos y pedidos tipo</h1>
          <p className="text-sm text-stone-600">Ninguno puede quedar debajo del margen mínimo ({cfg.margenMinimoPct}%).</p>
        </div>
        <Link href="/admin/combos/nuevo" className="btn">Nuevo combo</Link>
      </div>
      {eliminado && <p className="rounded-md bg-acopio-100 px-3 py-2 text-sm text-acopio-700">Combo eliminado.</p>}
      {combos.map((c) => {
        const lineas = c.items.map((i) => ({ precio: Number(i.product.precioPublico), costo: Number(i.product.costo), cantidad: i.cantidad }));
        const calc = calcularCombo(lineas, Number(c.descuentoPct), cfg.margenMinimoPct);
        const noPublicados = c.items.filter((i) => !i.product.visible || i.product.estado !== "ACTIVO" || Number(i.product.margenPct) < cfg.margenMinimoPct);
        return (
          <div key={c.id} className="tarjeta">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">
                <Link href={`/admin/combos/${c.id}`} className="hover:underline">{c.nombre}</Link>{" "}
                {!comboVigente(c) && <span className="chip bg-stone-200 text-stone-700">{c.activo ? "Fuera de vigencia" : "Inactivo"}</span>}{" "}
                <span className="chip bg-stone-100 text-stone-600">{c.tipo === "COMBO" ? "Combo" : "Pedido tipo"}</span>
              </h2>
              <div className="text-sm tabular-nums">
                {pesos(calc.precioCombo)} · costo {pesos(calc.costo)} ·{" "}
                <span className={calc.bloqueado ? "font-semibold text-red-600" : "text-acopio-700"}>margen {calc.margenPct.toFixed(1)}%</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-stone-600">
              <Link href={`/admin/combos/${c.id}`} className="text-acopio-700 underline">Editar</Link> · Descuento actual {Number(c.descuentoPct)}% · descuento máximo sin perforar el margen: {descuentoMaximo(lineas, cfg.margenMinimoPct)}%
              {c.tipo === "PEDIDO_NICHO" && calc.precioCombo < cfg.compraMinima ? ` · no llega a la compra mínima de ${pesos(cfg.compraMinima)}` : ""}
            </p>
            {calc.bloqueado && <p className="mt-2 rounded bg-red-50 px-2 py-1 text-sm text-red-700">Bloqueado: queda por debajo del margen mínimo.</p>}
            {noPublicados.length > 0 && (
              <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-sm text-amber-800">
                Incluye {noPublicados.length} producto(s) que hoy no se publican: {noPublicados.map((i) => i.product.producto).join(", ")}.
              </p>
            )}
            <ul className="mt-3 grid gap-x-6 text-sm sm:grid-cols-2">
              {c.items.map((i) => (
                <li key={i.codigo} className="flex justify-between border-b border-stone-100 py-1">
                  <Link href={`/admin/productos/${encodeURIComponent(i.codigo)}`} className="hover:underline">
                    {i.cantidad} × {i.product.producto} <span className="text-stone-500">{i.product.presentacion}</span>
                  </Link>
                  <span className="tabular-nums text-stone-600">{pesos(Number(i.product.precioPublico) * i.cantidad)}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
