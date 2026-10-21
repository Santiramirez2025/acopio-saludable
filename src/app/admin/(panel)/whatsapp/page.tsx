import { MensajeMedia } from "@/components/MensajeMedia";
import { sinIds } from "@/lib/whatsapp-media";
import Link from "next/link";
import { conversacionDe, listarConversaciones, mensajesDe, RETOMA_HORAS } from "@/lib/whatsapp-memoria";
import { cloudActivo } from "@/lib/whatsapp-cloud";
import { canalDe, claveValida, metaActivo, NOMBRE_CANAL, type CanalChat } from "@/lib/meta-mensajes";
import { COLOR_CANAL, contar, cuando, etapaDe, ETAPAS, etiquetaDia, FILTROS, filtroValido, iniciales, mismoDia, pasaFiltro, prefijo, teEspera, telefonoLindo, type Filtro } from "@/lib/bandeja";
import { Composer } from "@/components/bandeja/Composer";
import { AutoRefresco } from "@/components/bandeja/AutoRefresco";
import { AlFinal } from "@/components/bandeja/AlFinal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mensajes" };

const HORA = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Cordoba", hour: "2-digit", minute: "2-digit" });

type SP = { c?: string; f?: string; q?: string };

function url(sp: { c?: string | null; f?: Filtro; q?: string }) {
  const u = new URLSearchParams();
  if (sp.f && sp.f !== "todas") u.set("f", sp.f);
  if (sp.q) u.set("q", sp.q);
  if (sp.c) u.set("c", sp.c);
  const s = u.toString();
  return `/admin/whatsapp${s ? `?${s}` : ""}`;
}

function IconoCanal({ canal, className = "h-3.5 w-3.5" }: { canal: CanalChat; className?: string }) {
  if (canal === "whatsapp")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm4.52 11.99c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74 2.07.89 2.49.71 2.94.67.45-.04 1.47-.6 1.67-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29Z" />
      </svg>
    );
  if (canal === "messenger")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.15.26.35.27.57l.05 1.78a.8.8 0 0 0 1.12.71l1.98-.87c.17-.08.36-.09.54-.04.91.25 1.87.38 2.9.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2Zm6 7.46-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63Z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function Avatar({ nombre, clave, grande = false }: { nombre: string | null; clave: string; grande?: boolean }) {
  const canal = canalDe(clave);
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-acopio-100 font-semibold text-acopio-900 ${grande ? "h-11 w-11 text-sm" : "h-10 w-10 text-[13px]"}`}>
      {iniciales(nombre, clave)}
      <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white text-white" style={{ background: COLOR_CANAL[canal] }}>
        <IconoCanal canal={canal} className="h-2.5 w-2.5" />
      </span>
    </span>
  );
}

export default async function Mensajes({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f = filtroValido(sp.f);
  const q = (sp.q ?? "").slice(0, 60);
  const abierta = sp.c ? claveValida(sp.c) : null;

  const [todas, charla, mensajes] = await Promise.all([
    listarConversaciones(150),
    abierta ? conversacionDe(abierta) : null,
    abierta ? mensajesDe(abierta) : [],
  ]);
  const cuentas = contar(todas);
  const lista = todas.filter((c) => pasaFiltro(c, f, q));
  const sinLeer = todas.reduce((s, c) => s + c.noLeidos, 0);

  const canal = abierta ? canalDe(abierta) : null;
  const ultimoDelCliente = [...mensajes].reverse().find((m) => m.de === "cliente")?.fecha ?? null;
  const ventanaCerrada = Boolean(ultimoDelCliente && Date.now() - ultimoDelCliente.getTime() > 24 * 3_600_000);

  return (
    <div className="-mx-4 -my-6 sm:mx-0 sm:my-0">
      <AutoRefresco segundos={30} />
      <div className="flex h-[calc(100dvh-140px)] min-h-[520px] overflow-hidden border-stone-200 bg-white sm:rounded-2xl sm:border">
        {/* Lista */}
        <aside className={`${abierta ? "hidden md:flex" : "flex"} w-full flex-col border-r border-stone-200 md:w-[360px] md:shrink-0`}>
          <div className="space-y-2 border-b border-stone-200 p-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-acopio-900">
                Mensajes {sinLeer > 0 && <span className="ml-1 rounded-full bg-acopio-600 px-2 py-0.5 align-middle text-xs font-bold text-white">{sinLeer}</span>}
              </h1>
              <span className="flex items-center gap-1.5" title={`WhatsApp ${cloudActivo() ? "conectado" : "sin conectar"} · Messenger e Instagram ${metaActivo() ? "conectados" : "sin conectar"}`}>
                {(["whatsapp", "messenger", "instagram"] as const).map((k) => {
                  const ok = k === "whatsapp" ? cloudActivo() : metaActivo();
                  return (
                    <span key={k} className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: ok ? COLOR_CANAL[k] : "#d6d3d1" }}>
                      <IconoCanal canal={k} />
                    </span>
                  );
                })}
              </span>
            </div>
            <form action="/admin/whatsapp" className="relative">
              {f !== "todas" && <input type="hidden" name="f" value={f} />}
              <input name="q" defaultValue={q} placeholder="Buscar por nombre, número o mensaje" className="campo min-h-[40px] py-2 pl-9 text-sm" />
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </form>
            <nav className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
              {FILTROS.map(([id, nombre]) => {
                const n = cuentas[id];
                if (id !== "todas" && id !== f && n === 0) return null;
                const activo = id === f;
                return (
                  <Link
                    key={id}
                    href={url({ f: id, q })}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${activo ? "bg-acopio-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
                  >
                    {nombre} <span className={activo ? "text-white/70" : "text-stone-500"}>{n}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <ul className="flex-1 overflow-y-auto">
            {lista.map((c) => {
              const activa = c.telefono === abierta;
              const nombre = c.nombre || telefonoLindo(c.telefono);
              return (
                <li key={c.telefono}>
                  <Link
                    href={url({ f, q, c: c.telefono })}
                    className={`flex gap-3 border-b border-stone-100 px-3 py-3 transition ${activa ? "bg-acopio-50" : "hover:bg-stone-50"}`}
                  >
                    <Avatar nombre={c.nombre} clave={c.telefono} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-[15px] ${c.noLeidos > 0 ? "font-bold text-acopio-900" : "font-medium text-stone-800"}`}>{nombre}</span>
                        <span className={`shrink-0 text-xs tabular-nums ${c.noLeidos > 0 ? "font-semibold text-acopio-600" : "text-stone-500"}`}>{cuando(c.ultimoMensaje)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-[13px] ${c.noLeidos > 0 ? "text-stone-800" : "text-stone-500"}`}>
                          <span className="text-stone-400">{prefijo(c.ultimoDe)}</span>
                          {c.ultimoTexto ? sinIds(c.ultimoTexto) : "—"}
                        </p>
                        {c.noLeidos > 0 && <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-acopio-600 px-1.5 text-[11px] font-bold text-white">{c.noLeidos}</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {teEspera(c) && <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Te espera</span>}
                        {(() => {
                          const e = etapaDe(c);
                          return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ETAPAS[e].clase}`}>{e === "negocio" && c.baja ? "Baja" : ETAPAS[e].nombre}</span>;
                        })()}
                        {c.estado === "persona" && !teEspera(c) && <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">En tus manos</span>}
                        {c.anuncioId && <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">Anuncio</span>}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
            {!lista.length && (
              <li className="px-6 py-12 text-center text-sm text-stone-500">
                {todas.length ? "Nada con ese filtro." : "Todavía no escribió nadie."}
                {(f !== "todas" || q) && (
                  <Link href="/admin/whatsapp" className="mt-2 block font-semibold text-acopio-700 underline">
                    Ver todas
                  </Link>
                )}
              </li>
            )}
          </ul>
        </aside>

        {/* Charla */}
        <section className={`${abierta ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-[#f5f3ee]`}>
          {charla && canal ? (
            <>
              <header className="flex items-center gap-3 border-b border-stone-200 bg-white px-3 py-2.5">
                <Link href={url({ f, q })} className="-ml-1 rounded-full p-1.5 text-stone-600 hover:bg-stone-100 md:hidden" aria-label="Volver">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </Link>
                <Avatar nombre={charla.nombre} clave={charla.telefono} grande />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-acopio-900">{charla.nombre || telefonoLindo(charla.telefono)}</p>
                  <p className="truncate text-xs text-stone-600">
                    {NOMBRE_CANAL[canal]}
                    {canal === "whatsapp" && ` · ${telefonoLindo(charla.telefono)}`} ·{" "}
                    <span className={charla.estado === "persona" ? "font-semibold text-amber-700" : "text-acopio-700"}>{charla.estado === "persona" ? "La atendés vos" : "La atiende el vendedor"}</span>
                  </p>
                </div>
                {canal === "whatsapp" && (
                  <a href={`https://wa.me/${charla.telefono}`} target="_blank" rel="noopener" className="hidden rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-acopio-600 sm:inline-flex">
                    Abrir en WhatsApp
                  </a>
                )}
              </header>

              {(charla.anuncioTitulo || charla.prospecto) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-stone-200 bg-white/70 px-4 py-2 text-xs text-stone-700">
                  {charla.anuncioTitulo && <span>📣 Vino de un anuncio: <b>{charla.anuncioTitulo}</b></span>}
                  {charla.prospecto && <span>🏨 Le escribimos nosotros · {charla.prospecto}{charla.baja ? " · pidió no recibir más mensajes" : ""}</span>}
                </div>
              )}

              <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4 sm:px-6">
                {mensajes.map((m, i) => {
                  const nuevoDia = i === 0 || !mismoDia(mensajes[i - 1].fecha, m.fecha);
                  const propio = m.de !== "cliente";
                  return (
                    <div key={m.id}>
                      {nuevoDia && (
                        <div className="my-3 text-center">
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-stone-600 shadow-sm">{etiquetaDia(m.fecha)}</span>
                        </div>
                      )}
                      <div className={`flex ${propio ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2 text-[14px] leading-snug shadow-sm sm:max-w-[70%] ${
                            m.de === "cliente" ? "rounded-tl-sm bg-white text-stone-900" : m.de === "persona" ? "rounded-tr-sm bg-amber-100 text-stone-900" : "rounded-tr-sm bg-acopio-100 text-acopio-900"
                          }`}
                        >
                          <MensajeMedia texto={m.texto} />
                          <div className="mt-1 text-right text-[10px] text-stone-500">
                            {m.de === "bot" ? "Vendedor · " : m.de === "persona" ? "Vos · " : ""}
                            {HORA.format(m.fecha)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!mensajes.length && <p className="py-10 text-center text-sm text-stone-500">Sin mensajes todavía.</p>}
                <AlFinal marca={`${charla.telefono}:${mensajes.length}`} />
              </div>

              <Composer clave={charla.telefono} estado={charla.estado} noLeidos={charla.noLeidos} canal={NOMBRE_CANAL[canal]} ventanaCerrada={ventanaCerrada} />
            </>
          ) : (
            <div className="m-auto max-w-sm px-6 text-center text-sm text-stone-600">
              <p className="text-base font-semibold text-acopio-900">Elegí una charla</p>
              <p className="mt-2">
                El vendedor contesta solo por WhatsApp, Messenger e Instagram. Si alguien pide una persona, o si contestás vos, la charla queda en tus manos. Si no escribís en {RETOMA_HORAS} horas, el vendedor la retoma.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
