// Hoja del repartidor (26/11, Santiago: «un botón del repartidor con los pedidos de ese día y, dentro, lo que me gusta:
// avisar 5 minutos antes, mandarle mensaje al cliente con plantillas cargadas»). Pensada para el celular, en la calle:
// una tarjeta por parada, en el orden del recorrido, con lo que hay que cobrar bien grande y los botones a mano.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pesos } from "@/lib/precios";
import { linkMapa, direccionCompleta } from "@/lib/mapa";
import { telefonoWa } from "@/lib/telefono";
import { numeroPedido } from "@/lib/pedido-calculos";
import { ordenarParadas } from "@/lib/reparto";
import { avisarCincoMinutos, cambiarEstadoPedido, mensajeReparto } from "@/lib/acciones";
import { PLANTILLAS_REPARTO } from "@/lib/plantillas-reparto";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reparto" };

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const sinTildes = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** «Horario: viernes 17:30 · Referencia: casa azul · Venta por WhatsApp» → { horario, referencia, resto }. */
function leerNotas(notas: string | null) {
  const partes = (notas ?? "").split(" · ").map((x) => x.trim()).filter(Boolean);
  const horario = partes.find((x) => /^horario:/i.test(x))?.replace(/^horario:\s*/i, "") ?? "";
  const referencia = partes.find((x) => /^referencia:/i.test(x))?.replace(/^referencia:\s*/i, "") ?? "";
  const resto = partes.filter((x) => !/^(horario|referencia):/i.test(x) && !/^venta por whatsapp/i.test(x));
  return { horario, referencia, resto };
}

export default async function Reparto({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; ver?: string }> }) {
  const { ok, error, ver } = await searchParams;
  const hace10 = new Date(Date.now() - 10 * 86_400_000);
  const os = await prisma.order.findMany({
    where: {
      envioOrigen: "propia",
      OR: [
        { estado: { in: ["PAGADO", "EN_COMPRA", "PREPARADO", "ENVIADO"] } },
        { estado: "PENDIENTE_PAGO", medioPago: "AL_RECIBIR", createdAt: { gte: hace10 } },
        { estado: "PENDIENTE_PAGO", medioPago: "TRANSFERENCIA", createdAt: { gte: hace10 } },
      ],
    },
    include: { items: { orderBy: { id: "asc" } }, eventos: { orderBy: { fecha: "desc" }, take: 6 } },
    orderBy: { id: "asc" },
  });
  const hoy = DIAS[new Date(Date.now() - 3 * 3600_000).getUTCDay()];
  const manana = DIAS[(new Date(Date.now() - 3 * 3600_000).getUTCDay() + 1) % 7];
  type Parada = { o: (typeof os)[number]; zona: string; direccion: string | null; notas: ReturnType<typeof leerNotas> };
  const paradas = ordenarParadas<Parada>(
    os.map((o): Parada => ({
      o,
      zona: o.ciudad,
      direccion: o.calle,
      notas: leerNotas(o.notas),
    })),
  );
  // Qué día va: lo que dice el horario («viernes», «sábado», «hoy»); sin día, va en el próximo reparto.
  const diaDe = (h: string) => {
    const t = sinTildes(h);
    const d = DIAS.find((x) => t.includes(sinTildes(x)));
    if (d) return d;
    if (/\bhoy\b/.test(t)) return hoy;
    return "";
  };
  const filtro = ver === "todos" ? null : ver ?? null;
  const lista = paradas.filter((p) => !filtro || diaDe(p.notas.horario) === filtro || diaDe(p.notas.horario) === "");
  const porCobrar = lista.filter((p) => !p.o.pagadoAt).reduce((s, p) => s + Number(p.o.total), 0);
  const boton = "flex min-h-12 items-center justify-center rounded-xl px-3 py-2 text-center text-sm font-semibold";
  const okTexto = ok?.startsWith("cinco") ? "Le avisamos que estás a 5 minutos 🚗" : ok?.startsWith("entregado") ? "Marcado como entregado ✅" : ok?.startsWith("msj") ? "Mensaje enviado ✅" : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">🚚 Reparto</h1>
          <p className="text-sm text-stone-600">
            {lista.length} {lista.length === 1 ? "parada" : "paradas"} · a cobrar <b className="text-acopio-800">{pesos(porCobrar)}</b> · en orden de recorrido desde Las Jarillas
          </p>
        </div>
        <Link href="/admin/pedidos/compras" className="text-sm text-stone-600 underline">Hoja para imprimir</Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {[["", "Todos"], [hoy, `Hoy (${hoy})`], [manana, `Mañana (${manana})`]].map(([v, l]) => (
          <Link key={l} href={v ? `/admin/reparto?ver=${v}` : "/admin/reparto"} className={`chip px-3 py-1.5 text-sm ${(filtro ?? "") === v ? "bg-acopio-700 text-white" : "bg-stone-200 text-stone-700"}`}>{l}</Link>
        ))}
      </div>

      {okTexto && <p className="rounded-xl bg-acopio-100 px-3 py-2 text-sm font-medium text-acopio-800">{okTexto}</p>}
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">No salió: {error}</p>}

      {!lista.length && <p className="tarjeta text-center text-stone-600">No hay pedidos para entregar 🎉</p>}

      <ol className="space-y-4">
        {lista.map(({ o, notas }, i) => {
          const tel = telefonoWa(o.telefono);
          const mapa = linkMapa(o.calle, o.ciudad, o.provincia, o.cp, o.ubicacion);
          const dir = mapa ? direccionCompleta(o.calle, o.ciudad, o.provincia, o.cp) : "";
          const pagado = !!o.pagadoAt;
          const dia = diaDe(notas.horario);
          const esperaTransferencia = !pagado && o.medioPago === "TRANSFERENCIA" && o.estado === "PENDIENTE_PAGO";
          const avisos = o.eventos.filter((e) => /CAMBIO A REVISAR|Sumó por WhatsApp/.test(e.nota ?? ""));
          const yaAvisado = o.eventos.some((e) => /cadete está a 5 minutos/i.test(e.nota ?? "") && Date.now() - e.fecha.getTime() < 6 * 3600_000);
          return (
            <li key={o.id} className="tarjeta space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Parada {i + 1} · <Link href={`/admin/pedidos/${o.id}`} className="underline">{numeroPedido(o.id)}</Link>{dia && <span className="ml-1 chip bg-sol-claro text-acopio-900">{dia}</span>}</p>
                  <p className="text-lg font-bold">{o.nombre}</p>
                  {mapa ? <a href={mapa} target="_blank" rel="noopener noreferrer" className="text-sm text-acopio-700 underline">{dir}</a> : <p className="text-sm font-semibold text-red-700">Falta la dirección</p>}
                </div>
                <div className={`shrink-0 rounded-xl px-3 py-2 text-right ${pagado ? "bg-acopio-100 text-acopio-800" : esperaTransferencia ? "bg-amber-100 text-amber-900" : "bg-sol text-acopio-900"}`}>
                  <p className="text-[11px] font-semibold uppercase">{pagado ? "Ya pagó" : esperaTransferencia ? "Transferencia" : "Cobrar"}</p>
                  <p className="text-xl font-bold tabular-nums">{pesos(Number(o.total))}</p>
                </div>
              </div>

              {(notas.horario || notas.referencia) && (
                <p className="text-sm text-stone-700">{notas.horario && <>🕓 <b>{notas.horario}</b></>}{notas.horario && notas.referencia && " · "}{notas.referencia && <>🏠 {notas.referencia}</>}</p>
              )}
              <ul className="rounded-xl bg-stone-50 px-3 py-2 text-sm">
                {o.items.map((it) => <li key={it.id}>{it.cantidad} × {it.producto} <span className="text-stone-500">{it.presentacion}</span></li>)}
              </ul>
              {notas.resto.length > 0 && <p className="text-sm text-stone-700">📝 {notas.resto.join(" · ")}</p>}
              {avisos.map((e) => <p key={e.id} className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-900">⚠️ {e.nota}</p>)}

              <div className="grid grid-cols-2 gap-2">
                {mapa && <a href={mapa} target="_blank" rel="noopener noreferrer" className={`${boton} bg-acopio-700 text-white`}>📍 Cómo llegar</a>}
                {tel && (
                  <form action={avisarCincoMinutos} className="contents">
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="volver" value="reparto" />
                    <button className={`${boton} ${yaAvisado ? "border border-sol bg-white text-acopio-900" : "bg-sol text-acopio-900"}`}>🚗 {yaAvisado ? "Ya avisado · otra vez" : "Estoy a 5 minutos"}</button>
                  </form>
                )}
                {tel && <Link href={`/admin/whatsapp?c=${tel}`} className={`${boton} bg-[#25D366] text-white`}>💬 Chat</Link>}
                {tel && <a href={`tel:+${tel}`} className={`${boton} border border-stone-300 bg-white text-stone-800`}>📞 Llamar</a>}
              </div>

              {tel && (
                <details className="rounded-xl border border-stone-200 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-semibold text-stone-700">Mensajes rápidos al cliente</summary>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {Object.entries(PLANTILLAS_REPARTO).map(([clave, pl]) => (
                      <form key={clave} action={mensajeReparto} className="contents">
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="plantilla" value={clave} />
                        <button className={`${boton} border border-stone-300 bg-white text-stone-800`}>{pl.boton}</button>
                      </form>
                    ))}
                  </div>
                </details>
              )}

              <form action={cambiarEstadoPedido}>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="estado" value="ENTREGADO" />
                <input type="hidden" name="volver" value="reparto" />
                <button className={`${boton} w-full bg-stone-900 text-white`}>✅ Entregado{!pagado ? ` · cobré ${pesos(Number(o.total))}` : ""}</button>
              </form>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
