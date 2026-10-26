// La pizarra de mensajes (componente de servidor): en el panel se puede leer y contestar desde cada tarjeta;
// en la TV es solo para mirar (se contesta desde el celular).
import Link from "next/link";
import { Composer } from "@/components/bandeja/Composer";
import { AutoRefresco } from "@/components/bandeja/AutoRefresco";
import { COLOR_CANAL, cuando, ETAPAS, telefonoLindo } from "@/lib/bandeja";
import { canalDe } from "@/lib/meta-mensajes";
import type { PizarraMensajes as Datos } from "@/lib/pizarra-mensajes";
import { sinIds } from "@/lib/whatsapp-media";

const QUIEN = { cliente: "", bot: "🤖 ", persona: "Vos: " } as const;

function limpio(t: string, largo: number) {
  const s = sinIds(t).replace(/\s+/g, " ").trim();
  return s.length > largo ? `${s.slice(0, largo - 1)}…` : s;
}

export function PizarraMensajes({ p, enTv = false, volver }: { p: Datos; enTv?: boolean; volver?: string }) {
  const grande = enTv;
  return (
    <main className="min-h-screen bg-[#0b2a20] p-4 text-white sm:p-8">
      <AutoRefresco segundos={enTv ? 15 : 20} />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={`${grande ? "text-6xl" : "text-3xl sm:text-4xl"} font-black`}>💬 Mensajes en vivo</h1>
          <p className={`mt-1 ${grande ? "text-2xl" : "text-sm sm:text-base"} text-white/70`}>
            {p.hoy} charlas hoy · <b className="text-amber-300">{p.esperan} te esperan</b> · {p.sinLeer} sin leer · actualizado {p.actualizado}
          </p>
        </div>
        {!enTv ? (
          <div className="flex gap-2">
            <Link href="/admin/whatsapp" className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">Bandeja completa</Link>
            {volver ? <Link href={volver} className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">← Volver</Link> : null}
          </div>
        ) : null}
      </header>

      {p.charlas.length === 0 ? <p className="mt-10 text-center text-2xl text-white/60">No entró nada en las últimas 48 horas.</p> : null}

      <div className={`mt-6 grid gap-4 ${grande ? "grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
        {p.charlas.map((c) => {
          const canal = canalDe(c.clave);
          const nombre = c.nombre || telefonoLindo(c.clave);
          return (
            <article key={c.clave} className={`flex flex-col rounded-3xl p-4 ${c.espera ? "bg-amber-300 text-stone-900" : "bg-white text-stone-900"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className={`${grande ? "text-2xl" : "text-lg"} truncate font-bold`}>
                    <span className="mr-1.5 inline-block h-3 w-3 rounded-full align-middle" style={{ background: COLOR_CANAL[canal] }} />
                    {nombre}
                  </div>
                  <div className={`${grande ? "text-base" : "text-xs"} text-stone-500`}>
                    {cuando(c.ultimo)} · {c.estado === "bot" ? "atiende el bot" : "en tus manos"}
                    {c.anuncio ? ` · vino por «${limpio(c.anuncio, 30)}»` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ETAPAS[c.etapa].clase}`}>{ETAPAS[c.etapa].nombre}</span>
                  {c.espera ? <span className="rounded-full bg-stone-900 px-2 py-0.5 text-xs font-bold text-amber-300">TE ESPERA</span> : null}
                  {c.noLeidos ? <span className="rounded-full bg-acopio-700 px-2 py-0.5 text-xs font-bold text-white">{c.noLeidos} sin leer</span> : null}
                </div>
              </div>
              {c.resumen ? (
                <p className={`mt-2 rounded-2xl bg-stone-900/5 px-3 py-2 ${grande ? "text-base" : "text-xs"} text-stone-700`}>
                  <b>{c.resumen.calor === "caliente" ? "🔥 Por comprar" : c.resumen.calor === "frio" ? "🧊 Se enfrió" : c.resumen.calor === "cliente" ? "💚 Cliente" : "🤔 Interesado"}</b> · {c.resumen.texto}
                </p>
              ) : null}
              <ul className={`mt-3 space-y-1.5 ${grande ? "text-lg" : "text-sm"}`}>
                {c.mensajes.map((m, i) => (
                  <li key={i} className={`rounded-2xl px-3 py-1.5 ${m.de === "cliente" ? "mr-6 bg-stone-100" : "ml-6 bg-emerald-50 text-emerald-950"}`}>
                    {QUIEN[m.de]}
                    {limpio(m.texto, grande ? 140 : 220)}
                  </li>
                ))}
              </ul>
              {c.pedido ? <p className={`mt-2 ${grande ? "text-base" : "text-xs"} text-stone-600`}>🛒 {limpio(c.pedido, 120)}</p> : null}
              {!enTv ? (
                <details className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-white">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-acopio-900">✍️ Intervenir (contestar, tomar o devolver al bot)</summary>
                  <Composer clave={c.clave} estado={c.estado} noLeidos={0} canal={canal} ventanaCerrada={c.ventanaCerrada} />
                  <Link href={`/admin/whatsapp?c=${encodeURIComponent(c.clave)}`} className="block border-t border-stone-100 px-3 py-2 text-sm text-acopio-700">Ver la charla completa →</Link>
                </details>
              ) : null}
            </article>
          );
        })}
      </div>
    </main>
  );
}
