import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { NICHOS } from "@/lib/taxonomia";
import { calcularCombo, descuentoMaximo, pesos } from "@/lib/precios";
import { eliminarCombo } from "@/lib/acciones";
import { FormCombo } from "@/components/FormCombo";

const aFecha = (d: Date | null) => (d ? new Date(d.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10) : "");

export default async function EditarCombo({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const esNuevo = id === "nuevo";
  const [combo, cfg] = await Promise.all([
    esNuevo || !/^\d+$/.test(id) ? null : prisma.combo.findUnique({ where: { id: Number(id) }, include: { items: { include: { product: true }, orderBy: { codigo: "asc" } } } }),
    leerConfig(),
  ]);
  if (!esNuevo && !combo) notFound();
  const lineas = (combo?.items ?? []).map((i) => ({ precio: Number(i.product.precioPublico), costo: Number(i.product.costo), cantidad: i.cantidad }));
  const calc = calcularCombo(lineas, Number(combo?.descuentoPct ?? 0), cfg.margenMinimoPct);

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/admin/combos" className="text-sm text-stone-500 underline">← Combos</Link>
      <h1 className="text-xl font-semibold">{combo ? combo.nombre : "Nuevo combo"}</h1>
      {ok && <p className="rounded-md bg-acopio-100 px-3 py-2 text-sm text-acopio-700">Combo guardado.</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">No se guardó: {error}</p>}
      {combo && (
        <p className="text-sm tabular-nums text-stone-600">
          Lista {pesos(calc.precioLista)} · precio {pesos(calc.precioCombo)} · costo {pesos(calc.costo)} ·{" "}
          <span className={calc.bloqueado ? "font-semibold text-red-600" : "text-acopio-700"}>margen {calc.margenPct.toFixed(1)}%</span> · descuento máximo{" "}
          {descuentoMaximo(lineas, cfg.margenMinimoPct)}%
        </p>
      )}

      <FormCombo
        id={combo?.id ?? null}
        nichos={NICHOS.map((n) => ({ ...n }))}
        inicial={{
          nombre: combo?.nombre ?? "",
          slug: combo?.slug ?? "",
          tipo: combo?.tipo ?? "COMBO",
          nicho: combo?.nicho ?? "",
          descuentoPct: String(Number(combo?.descuentoPct ?? 0)),
          vigenteDesde: aFecha(combo?.vigenteDesde ?? null),
          vigenteHasta: aFecha(combo?.vigenteHasta ?? null),
          items: (combo?.items ?? []).map((i) => `${i.codigo} x ${i.cantidad}`).join("\n"),
          activo: combo?.activo ?? true,
          destacado: combo?.destacado ?? false,
        }}
      />

      {combo && (
        <>
          <div className="tarjeta">
            <h2 className="mb-2 text-sm font-semibold">Productos del combo</h2>
            <ul className="text-sm">
              {combo.items.map((i) => (
                <li key={i.codigo} className="flex justify-between border-b border-stone-100 py-1">
                  <Link href={`/admin/productos/${encodeURIComponent(i.codigo)}`} className="hover:underline">
                    {i.cantidad} × {i.product.producto} <span className="text-stone-400">{i.product.presentacion}</span>
                  </Link>
                  <span className="tabular-nums text-stone-500">{pesos(Number(i.product.precioPublico) * i.cantidad)}</span>
                </li>
              ))}
            </ul>
          </div>
          <form action={eliminarCombo} className="tarjeta flex flex-wrap items-center gap-3 text-sm">
            <input type="hidden" name="id" value={combo.id} />
            <label className="flex items-center gap-2"><input type="checkbox" name="confirmar" /> Confirmo que quiero eliminar este combo</label>
            <button className="btn-sec text-red-700">Eliminar</button>
          </form>
        </>
      )}
    </div>
  );
}
