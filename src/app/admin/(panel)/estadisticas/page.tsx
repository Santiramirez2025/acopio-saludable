import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pesos } from "@/lib/precios";
import { NICHOS } from "@/lib/taxonomia";
import { ESTADOS_VENTA, resumir, serieDiaria, type FilaRanking } from "@/lib/estadisticas";
import { diaLocal } from "@/lib/sync";
import { BarrasPorDia } from "@/components/Graficos";

const PERIODOS = [["7", "7 días"], ["30", "30 días"], ["90", "90 días"], ["365", "12 meses"]] as const;

export default async function Estadisticas({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const sp = await searchParams;
  const dias = PERIODOS.some(([d]) => d === sp.dias) ? Number(sp.dias) : 30;
  const desde = new Date(Date.now() - (dias - 1) * 86400000);
  const [pedidos, pendientes, combos] = await Promise.all([
    prisma.order.findMany({ where: { estado: { in: [...ESTADOS_VENTA] }, createdAt: { gte: new Date(`${diaLocal(desde)}T00:00:00-03:00`) } }, include: { items: true } }),
    prisma.order.count({ where: { estado: "PENDIENTE_PAGO" } }),
    prisma.combo.findMany({ select: { slug: true, nombre: true } }),
  ]);
  const codigos = [...new Set(pedidos.flatMap((p) => p.items.map((i) => i.codigo)))];
  const productos = codigos.length ? await prisma.product.findMany({ where: { codigo: { in: codigos } }, select: { codigo: true, nichos: true } }) : [];
  const r = resumir(pedidos, new Map(productos.map((p) => [p.codigo, p.nichos])), {
    nichos: new Map(NICHOS.map((n) => [n.id, n.nombre])),
    combos: new Map(combos.map((c) => [c.slug, c.nombre])),
  });
  const serie = serieDiaria(r.porDia, diaLocal(desde), diaLocal(new Date()));
  const tiles = [
    ["Ventas", pesos(r.ventas), "productos menos descuentos"],
    ["Pedidos", String(r.pedidos), pendientes ? `${pendientes} más esperan pago` : "confirmados"],
    ["Ticket promedio", pesos(r.ticketPromedio), "por pedido"],
    ["Margen bruto", pesos(r.margenBruto), `${r.margenBrutoPct.toFixed(1)}% de las ventas`],
    ["Margen neto", pesos(r.margenNeto), `${r.margenNetoPct.toFixed(1)}% de las ventas`],
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Estadísticas</h1>
          <p className="text-sm text-stone-600">Pedidos con pago confirmado. Los pendientes y cancelados no cuentan.</p>
        </div>
        <div className="flex gap-1 text-sm">
          {PERIODOS.map(([d, nombre]) => (
            <Link key={d} href={`/admin/estadisticas?dias=${d}`} className={`chip ${Number(d) === dias ? "bg-acopio-600 text-white" : "bg-stone-200 text-stone-700"}`}>{nombre}</Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map(([titulo, valor, pie]) => (
          <div key={titulo} className="tarjeta">
            <div className="text-xs uppercase tracking-wide text-stone-600">{titulo}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{valor}</div>
            <div className="text-xs text-stone-600">{pie}</div>
          </div>
        ))}
      </div>

      {r.pedidos === 0 ? (
        <p className="tarjeta text-sm text-stone-600">Todavía no hay pedidos confirmados en este período. Las estadísticas se completan solas a medida que entran ventas.</p>
      ) : (
        <>
          <div className="tarjeta">
            <h2 className="mb-2 text-sm font-semibold">Ventas por día</h2>
            <BarrasPorDia datos={serie} />
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-stone-600">Ver como tabla</summary>
              <table className="mt-2 w-full max-w-md tabular-nums">
                <tbody>
                  {serie.filter((d) => d.pedidos > 0).map((d) => (
                    <tr key={d.dia} className="border-b border-stone-100"><td className="py-1">{d.dia.split("-").reverse().join("/")}</td><td className="py-1 text-right">{d.pedidos}</td><td className="py-1 text-right">{pesos(d.ventas)}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>

          <div className="tarjeta text-sm">
            <h2 className="mb-2 text-sm font-semibold">Del margen bruto al neto</h2>
            <dl className="max-w-md space-y-1 tabular-nums">
              <div className="flex justify-between"><dt>Margen bruto</dt><dd>{pesos(r.margenBruto)}</dd></div>
              <div className="flex justify-between text-stone-600"><dt>Subsidio de envío (envío real − cobrado)</dt><dd>− {pesos(r.subsidioEnvio)}</dd></div>
              <div className="flex justify-between text-stone-600"><dt>Comisiones de pago</dt><dd>− {pesos(r.comisiones)}</dd></div>
              <div className="flex justify-between text-stone-600"><dt>Packaging</dt><dd>− {pesos(r.packaging)}</dd></div>
              <div className="flex justify-between border-t border-stone-200 pt-1 font-semibold"><dt>Margen neto</dt><dd>{pesos(r.margenNeto)}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-stone-600">Los descuentos por transferencia ({pesos(r.descuentos)}) ya están restados de las ventas.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Ranking titulo="Productos por margen en pesos" filas={r.productos.slice(0, 15)} enlace={(f) => `/admin/productos/${encodeURIComponent(f.clave)}`} />
            <div className="space-y-4">
              <Ranking titulo="Nichos por margen en pesos" filas={r.nichos} nota="Un producto puede estar en varios nichos: su margen cuenta en cada uno, así que los nichos no suman el total." />
              <Ranking titulo="Combos por margen en pesos" filas={r.combos} vacio="No se vendieron combos en este período." />
            </div>
          </div>
          <p className="text-xs text-stone-600">Los rankings usan el margen de cada renglón (precio − costo al momento de la compra), antes de descuentos del pedido, envío, comisiones y packaging.</p>
        </>
      )}
    </div>
  );
}

function Ranking({ titulo, filas, enlace, nota, vacio }: { titulo: string; filas: FilaRanking[]; enlace?: (f: FilaRanking) => string; nota?: string; vacio?: string }) {
  return (
    <div className="tarjeta">
      <h2 className="mb-2 text-sm font-semibold">{titulo}</h2>
      {filas.length ? (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-stone-600"><tr><th className="py-1">#</th><th className="py-1"> </th><th className="py-1 text-right">Unid.</th><th className="py-1 text-right">Ventas</th><th className="py-1 text-right">Margen</th></tr></thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.clave} className="border-t border-stone-100">
                <td className="py-1 pr-2 text-stone-500">{i + 1}</td>
                <td className="py-1">{enlace ? <Link href={enlace(f)} className="hover:underline">{f.nombre}</Link> : f.nombre}</td>
                <td className="py-1 text-right tabular-nums">{f.unidades}</td>
                <td className="py-1 text-right tabular-nums">{pesos(f.ventas)}</td>
                <td className="py-1 text-right font-medium tabular-nums">{pesos(f.margen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-stone-600">{vacio ?? "Sin datos en este período."}</p>
      )}
      {nota && <p className="mt-2 text-xs text-stone-600">{nota}</p>}
    </div>
  );
}
