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
  // Canales: de dónde vino cada pedido (columna «origen», por SQL directo) y si era su primera compra.
  const ids = pedidos.map((p) => p.id);
  const origenes = ids.length ? await prisma.$queryRaw<{ id: number; origen: string | null }[]>`SELECT "id", "origen" FROM "Order" WHERE "id" = ANY(${ids})` : [];
  const origenDe = new Map(origenes.map((o) => [o.id, o.origen]));
  const previos = ids.length
    ? await prisma.$queryRaw<{ id: number; antes: bigint }[]>`SELECT o."id", (SELECT count(*) FROM "Order" p WHERE p."telefono" = o."telefono" AND p."id" < o."id" AND p."estado" <> 'CANCELADO') AS antes FROM "Order" o WHERE o."id" = ANY(${ids})`
    : [];
  const esNuevo = new Map(previos.map((x) => [x.id, Number(x.antes) === 0]));
  const canalDe = (o: string | null) => (o ?? "sin dato").split(" → ")[0].replace(/ · \d{4}-\d{2}-\d{2}$/, "").replace(/^whatsapp · anuncio: .*/, "whatsapp · anuncio").trim() || "sin dato";
  const canales = new Map<string, { pedidos: number; nuevos: number; ventas: number; contribucion: number }>();
  for (const p of pedidos) {
    const c = canalDe(origenDe.get(p.id) ?? null);
    const fila = canales.get(c) ?? { pedidos: 0, nuevos: 0, ventas: 0, contribucion: 0 };
    fila.pedidos++;
    if (esNuevo.get(p.id)) fila.nuevos++;
    fila.ventas += Number(p.total);
    fila.contribucion += Number(p.total) - Number(p.costoProductos) - Number(p.costoEnvioReal) - Number(p.comisionPago) - Number(p.costoPackaging);
    canales.set(c, fila);
  }
  // Recomendaciones: pedidos que llegaron con el link «amigo-…» de otro cliente.
  const conAmigo = pedidos.map((p) => ({ p, codigo: (origenDe.get(p.id) ?? "").match(/amigo-([a-z0-9]{4,12})/)?.[1] })).filter((x) => x.codigo);
  const referentes = conAmigo.length
    ? await prisma.$queryRaw<{ codigo: string; id: number; nombre: string; telefono: string }[]>`SELECT lower(left(regexp_replace("token", '[^A-Za-z0-9]', '', 'g'), 8)) AS codigo, "id", "nombre", "telefono" FROM "Order" WHERE lower(left(regexp_replace("token", '[^A-Za-z0-9]', '', 'g'), 8)) = ANY(${conAmigo.map((x) => x.codigo!)})`
    : [];
  const recomendaciones = conAmigo.map(({ p, codigo }) => ({ p, ref: referentes.find((r) => r.codigo === codigo), nuevo: esNuevo.get(p.id) }));
  const filasCanal = [...canales.entries()].sort((a, b) => b[1].contribucion - a[1].contribucion);
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

          <div className="tarjeta text-sm">
            <h2 className="mb-1 text-sm font-semibold">Canales: de dónde vienen los compradores</h2>
            <p className="mb-2 text-xs text-stone-600">Contribución = total cobrado − mercadería − envío real − comisión − packaging. «Nuevos» = primera compra con ese teléfono. Los pedidos anteriores a esta medición salen «sin dato».</p>
            <table className="w-full tabular-nums">
              <thead><tr className="text-left text-xs text-stone-600"><th className="py-1">Canal</th><th className="py-1 text-right">Pedidos</th><th className="py-1 text-right">Nuevos</th><th className="py-1 text-right">Ventas</th><th className="py-1 text-right">Contribución</th></tr></thead>
              <tbody>
                {filasCanal.map(([c, f]) => (
                  <tr key={c} className="border-t border-stone-100"><td className="py-1">{c}</td><td className="py-1 text-right">{f.pedidos}</td><td className="py-1 text-right">{f.nuevos}</td><td className="py-1 text-right">{pesos(f.ventas)}</td><td className={`py-1 text-right ${f.contribucion < 0 ? "text-red-700" : ""}`}>{pesos(f.contribucion)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tarjeta text-sm">
            <h2 className="mb-1 text-sm font-semibold">Recomendaciones confirmadas</h2>
            {recomendaciones.length ? (
              <ul className="space-y-1">
                {recomendaciones.map(({ p, ref, nuevo }) => (
                  <li key={p.id}>
                    <Link href={`/admin/pedidos/${p.id}`} className="underline">{p.nombre}</Link> compró {pesos(Number(p.total))}{nuevo ? " (primera compra)" : ""} recomendado por {ref ? <Link href={`/admin/pedidos/${ref.id}`} className="underline">{ref.nombre}</Link> : "un código que no encontramos"}.
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-stone-600">Todavía ninguna. Cada pedido pagado tiene un botón «Recomendar por WhatsApp» con el link del cliente.</p>
            )}
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
