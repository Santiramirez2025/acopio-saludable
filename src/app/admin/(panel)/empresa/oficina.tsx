"use client";

// La oficina de Acopio: el equipo de agentes como personas. Se puede abrir a cada uno, hablarle (por
// escrito o con la voz), leer sus informes y dejarle órdenes. En modo TV ocupa toda la pantalla, se
// maneja con las flechas y Enter del control remoto, se actualiza sola y va mostrando quién hizo qué.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { callar, decir, escuchar as escucharVoz, hayVozNatural } from "./voz-cliente";
import { llamar, type EstadoLlamada, type Llamada } from "./en-vivo";
import { AGENTES } from "@/lib/agentes";
import { BotonTv } from "./boton-tv";

export type Informe = { cuando: string; ok: boolean; texto: string };
export type AgenteVista = {
  id: string;
  persona: string;
  nombre: string;
  puesto: string;
  area: string;
  emoji: string;
  horario: string;
  mision: string;
  hace: string[];
  mide: string;
  estado: "ok" | "falla" | "pendiente" | "atrasado" | "descanso";
  estadoTexto: string;
  informes: Informe[];
  ordenes: { cuando: string; texto: string }[];
};
export type DatosOficina = {
  hoy: string;
  hora: string;
  kpis: { titulo: string; valor: string }[];
  temporada: string;
  proxima: string;
  parte: { cuando: string; texto: string } | null;
  areas: { id: string; nombre: string; bajada: string }[];
  agentes: AgenteVista[];
  robots: { nombre: string; cuando: string; hace: string }[];
  salud: string;
  /** Resumen de la pizarra de armado (va en la pizarra de Gonza en 3D). */
  armado?: string;
};

type Mensaje = { role: "user" | "assistant"; content: string; orden?: string | null; vivo?: boolean; rid?: string };

const PUNTO: Record<AgenteVista["estado"], string> = {
  ok: "bg-emerald-500",
  falla: "bg-red-500",
  atrasado: "bg-amber-500",
  pendiente: "bg-sky-500 animate-pulse",
  descanso: "bg-stone-400",
};
const PILDORA: Record<AgenteVista["estado"], string> = {
  ok: "bg-emerald-100 text-emerald-800",
  falla: "bg-red-100 text-red-800",
  atrasado: "bg-amber-100 text-amber-900",
  pendiente: "bg-sky-100 text-sky-800",
  descanso: "bg-stone-100 text-stone-600",
};

/** Primera línea útil de un informe, para la tarjeta. */
function resumen(t: string, largo = 140): string {
  const l = t.split("\n").map((x) => x.replace(/^[#*\-•\s]+/, "").trim()).find((x) => x.length > 12) ?? "";
  return l.length > largo ? `${l.slice(0, largo - 1)}…` : l;
}

export function Oficina({ datos }: { datos: DatosOficina }) {
  const router = useRouter();
  const [tv, setTv] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [foco, setFoco] = useState(0);
  const [destacado, setDestacado] = useState(0);
  const quieto = useRef(Date.now());

  // ?tv=1 abre directo en modo TV (para dejarlo como favorito en el televisor).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tv") === "1") setTv(true);
  }, []);

  // Se actualiza sola cada minuto (los agentes trabajan aunque nadie mire).
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(t);
  }, [router]);

  const conInforme = useMemo(() => datos.agentes.filter((a) => a.informes.length), [datos.agentes]);

  // En TV, si nadie toca nada, va mostrando el último trabajo de cada agente.
  useEffect(() => {
    if (!tv) return;
    const t = setInterval(() => {
      if (Date.now() - quieto.current > 15_000 && !abierto && conInforme.length) setDestacado((d) => (d + 1) % conInforme.length);
    }, 12_000);
    return () => clearInterval(t);
  }, [tv, abierto, conInforme.length]);

  const columnas = tv ? 4 : 1;
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      quieto.current = Date.now();
      if (abierto) {
        if (e.key === "Escape" || (e.key === "Backspace" && !["TEXTAREA", "INPUT"].includes((e.target as HTMLElement)?.tagName))) setAbierto(null);
        return;
      }
      if (!tv) return;
      const n = datos.agentes.length;
      if (e.key === "ArrowRight") setFoco((f) => (f + 1) % n);
      else if (e.key === "ArrowLeft") setFoco((f) => (f - 1 + n) % n);
      else if (e.key === "ArrowDown") setFoco((f) => Math.min(n - 1, f + columnas));
      else if (e.key === "ArrowUp") setFoco((f) => Math.max(0, f - columnas));
      else if (e.key === "Enter") setAbierto(datos.agentes[foco]?.id ?? null);
      else if (e.key === "Escape") setTv(false);
      else return;
      e.preventDefault();
    },
    [abierto, tv, datos.agentes, foco, columnas],
  );
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const atencion = datos.agentes.filter((a) => a.estado === "falla" || a.estado === "atrasado");
  const trabajan = datos.agentes.filter((a) => a.estado !== "descanso");
  const cumplieron = trabajan.filter((a) => a.estado === "ok").length;
  const agente = datos.agentes.find((a) => a.id === abierto) ?? null;
  const spot = tv && conInforme.length ? conInforme[destacado % conInforme.length] : null;

  const entrarTv = () => {
    setTv(true);
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  };
  const salirTv = () => {
    setTv(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
  };

  const oscuro = tv;
  const tarjeta = oscuro ? "rounded-2xl border border-white/10 bg-white/5" : "rounded-2xl border border-stone-200 bg-white shadow-sm";
  const suave = oscuro ? "text-white/60" : "text-stone-500";

  const contenido = (
    <div className={tv ? "mx-auto max-w-[1800px] space-y-6 p-8 text-white" : "space-y-6"}>
      {/* Encabezado */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={`text-sm ${suave}`}>Acopio Saludable · {datos.hoy} · {datos.hora}</p>
          <h1 className={tv ? "text-4xl font-semibold" : "text-2xl font-semibold"}>La empresa</h1>
          <p className={`mt-1 max-w-3xl text-sm ${suave}`}>
            {trabajan.length ? `${cumplieron} de ${trabajan.length} personas del equipo ya trabajaron hoy.` : "Hoy el equipo descansa."} Tocá a cualquiera para hablarle o dejarle una orden.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.refresh()} className={`rounded-full px-4 py-2 text-sm ${oscuro ? "bg-white/10 hover:bg-white/20" : "border border-stone-300 bg-white hover:bg-stone-50"}`}>↻ Actualizar</button>
          <a href="/admin/empresa/3d" className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-amber-300">🕹️ Oficina 3D</a>
          <a href="/admin/empresa/armado" className={`rounded-full px-4 py-2 text-sm ${oscuro ? "bg-white/10 hover:bg-white/20" : "border border-stone-300 bg-white hover:bg-stone-50"}`}>📦 Pizarra de armado</a>
          {tv ? (
            <button onClick={salirTv} className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">Salir de TV</button>
          ) : (
            <>
              <BotonTv oscuro={false} />
              <button onClick={entrarTv} className="rounded-full bg-acopio-700 px-4 py-2 text-sm text-white hover:bg-acopio-900">Pantalla completa</button>
            </>
          )}
        </div>
      </header>

      {/* Números */}
      <section className={`grid gap-3 ${tv ? "grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}`}>
        {datos.kpis.map((k) => (
          <div key={k.titulo} className={`${tarjeta} p-4`}>
            <div className={`${tv ? "text-4xl" : "text-2xl"} font-semibold tabular-nums`}>{k.valor}</div>
            <div className={`text-xs ${suave}`}>{k.titulo}</div>
          </div>
        ))}
      </section>

      {/* Parte del día + atención + temporada */}
      <section className="grid gap-3 lg:grid-cols-3">
        <button onClick={() => setAbierto("gerente")} className={`${tarjeta} p-4 text-left lg:col-span-2`}>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/avatars/gerente.svg" alt="" className="h-12 w-12" />
            <div>
              <div className="font-semibold">Parte del día · Laura, Gerente General</div>
              <div className={`text-xs ${suave}`}>{datos.parte ? datos.parte.cuando : "Todavía no hay parte: Laura lo manda a las 12:57 de lunes a sábado"}</div>
            </div>
          </div>
          {datos.parte ? <p className={`mt-3 line-clamp-6 whitespace-pre-wrap text-sm ${oscuro ? "text-white/85" : "text-stone-700"}`}>{datos.parte.texto}</p> : null}
        </button>
        <div className="space-y-3">
          <div className={`${tarjeta} p-4`}>
            <div className="text-sm font-semibold">Fecha comercial</div>
            <p className={`mt-1 text-sm ${oscuro ? "text-white/85" : "text-stone-700"}`}>🎄 {datos.temporada}</p>
            {datos.proxima ? <p className={`text-xs ${suave}`}>Después: {datos.proxima}</p> : null}
          </div>
          <div className={`${tarjeta} p-4`}>
            <div className="text-sm font-semibold">Necesita atención</div>
            {atencion.length ? (
              <ul className="mt-2 space-y-1 text-sm">
                {atencion.map((a) => (
                  <li key={a.id}>
                    <button onClick={() => setAbierto(a.id)} className="flex items-center gap-2 hover:underline">
                      <span className={`h-2 w-2 rounded-full ${PUNTO[a.estado]}`} /> {a.persona}: {a.estadoTexto}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`mt-1 text-sm ${suave}`}>Todo en orden ✅</p>
            )}
          </div>
        </div>
      </section>

      {/* El equipo, por áreas */}
      {datos.areas.map((area) => {
        const del = datos.agentes.filter((a) => a.area === area.id);
        if (!del.length) return null;
        return (
          <section key={area.id}>
            <h2 className={tv ? "text-2xl font-semibold" : "text-lg font-semibold"}>{area.nombre}</h2>
            <p className={`mb-3 text-sm ${suave}`}>{area.bajada}</p>
            <div className={`grid gap-3 ${tv ? "grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
              {del.map((a) => {
                const i = datos.agentes.indexOf(a);
                const enFoco = tv && i === foco;
                const enSpot = spot?.id === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setAbierto(a.id)}
                    onMouseEnter={() => tv && setFoco(i)}
                    className={`${tarjeta} group flex flex-col gap-2 p-4 text-left transition ${enFoco ? "ring-4 ring-acopio-500 scale-[1.02]" : ""} ${enSpot && !enFoco ? "ring-2 ring-white/40" : ""} ${oscuro ? "" : "hover:border-acopio-400 hover:shadow-md"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/avatars/${a.id}.svg`} alt="" className={tv ? "h-20 w-20" : "h-14 w-14"} />
                        <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 ${oscuro ? "border-stone-900" : "border-white"} ${PUNTO[a.estado]}`} />
                      </div>
                      <div className="min-w-0">
                        <div className={`${tv ? "text-xl" : "text-base"} font-semibold`}>{a.persona} <span className="font-normal">{a.emoji}</span></div>
                        <div className={`text-sm ${oscuro ? "text-white/80" : "text-stone-700"}`}>{a.nombre}</div>
                        <div className={`text-xs ${suave}`}>{a.horario}</div>
                      </div>
                    </div>
                    <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${PILDORA[a.estado]}`}>{a.estadoTexto}</span>
                    <p className={`line-clamp-2 text-sm ${oscuro ? "text-white/70" : "text-stone-600"}`}>
                      {a.informes[0] ? resumen(a.informes[0].texto) : a.mision}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Robots */}
      <details className={`${tarjeta} p-4`}>
        <summary className="cursor-pointer text-sm font-semibold">⚙️ Robots automáticos del sitio ({datos.robots.length})</summary>
        <div className={`mt-3 grid gap-2 ${tv ? "grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {datos.robots.map((r) => (
            <div key={r.nombre} className="text-sm">
              <b>{r.nombre}</b> <span className={suave}>· {r.cuando}</span>
              <div className={suave}>{r.hace}</div>
            </div>
          ))}
        </div>
        {datos.salud ? <pre className={`mt-3 whitespace-pre-wrap text-xs ${suave}`}>{datos.salud}</pre> : null}
      </details>

      {tv ? <p className={`text-center text-xs ${suave}`}>Flechas para moverte · Enter para abrir · Escape para volver</p> : null}
    </div>
  );

  return (
    <>
      {tv ? <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950">{contenido}{spot && !abierto ? <Spot a={spot} onAbrir={() => setAbierto(spot.id)} /> : null}</div> : contenido}
      {agente ? <Ficha a={agente} tv={tv} onCerrar={() => setAbierto(null)} onCambio={() => router.refresh()} /> : null}
    </>
  );
}

/** Franja de abajo en TV: el último trabajo de un agente. */
function Spot({ a, onAbrir }: { a: AgenteVista; onAbrir: () => void }) {
  return (
    <button onClick={onAbrir} className="fixed inset-x-0 bottom-0 z-[55] flex items-center gap-4 border-t border-white/10 bg-stone-900/95 px-8 py-4 text-left text-white backdrop-blur">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/avatars/${a.id}.svg`} alt="" className="h-14 w-14 shrink-0" />
      <div className="min-w-0">
        <div className="text-sm text-white/60">Ahora · {a.persona}, {a.nombre} · {a.informes[0]?.cuando}</div>
        <div className="line-clamp-2 text-lg">{resumen(a.informes[0]?.texto ?? "", 260)}</div>
      </div>
    </button>
  );
}

/** La ficha de un agente: hablarle, sus informes, sus órdenes y su perfil. */
export function Ficha({ a, tv, onCerrar, onCambio, manosLibres = false, angosta = false }: { a: AgenteVista; tv: boolean; onCerrar: () => void; onCambio: () => void; manosLibres?: boolean; angosta?: boolean }) {
  const [pestana, setPestana] = useState<"hablar" | "informes" | "ordenes" | "perfil">("hablar");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [voz, setVoz] = useState(manosLibres);
  const [escuchando, setEscuchando] = useState(false);
  const [orden, setOrden] = useState("");
  const [ordenOk, setOrdenOk] = useState("");
  const fin = useRef<HTMLDivElement>(null);
  const cortarMic = useRef<(() => void) | null>(null);
  const [estadoVoz, setEstadoVoz] = useState("");
  const llamada = useRef<Llamada | null>(null);
  const ultimoRefresco = useRef(0);
  const [enVivo, setEnVivo] = useState<EstadoLlamada | null>(null);
  useEffect(() => () => {
    cortarMic.current?.();
    callar();
    llamada.current?.cortar();
  }, []);

  // La charla queda guardada en el servidor (se ve desde cualquier dispositivo y el agente la recuerda).
  // El navegador guarda una copia por si no hay conexión; la primera vez se suben las charlas viejas de acá.
  const clave = `acopio-charla-${a.id}`;
  const guardados = useRef(0);
  const cargada = useRef(false);
  useEffect(() => {
    let vivo = true;
    cargada.current = false;
    let local: Mensaje[] = [];
    try {
      const g = localStorage.getItem(clave);
      local = g ? (JSON.parse(g) as Mensaje[]).filter((m) => !m.vivo) : [];
    } catch {
      local = [];
    }
    setMensajes(local);
    guardados.current = local.length;
    void fetch(`/api/admin/agentes/charla?agente=${a.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (d: { mensajes?: Mensaje[] } | null) => {
        if (!vivo || !d) return;
        const servidor = (d.mensajes ?? []).map(({ role, content, orden }) => ({ role, content, orden }));
        if (servidor.length) {
          // lo que haya empezado mientras cargaba (por ejemplo el saludo de la llamada) queda después
          setMensajes((prev) => [...servidor, ...prev.slice(local.length)]);
          guardados.current = servidor.length;
        } else if (local.length) {
          // primera vez: subo lo que estaba solo en este navegador
          await fetch("/api/admin/agentes/charla", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agente: a.id, mensajes: local.slice(-20) }) }).catch(() => undefined);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        cargada.current = true;
      });
    return () => {
      vivo = false;
    };
  }, [clave, a.id]);
  useEffect(() => {
    const enCurso = mensajes[mensajes.length - 1]?.vivo;
    if (!enCurso) {
      try {
        localStorage.setItem(clave, JSON.stringify(mensajes.slice(-30)));
      } catch {
        /* sin almacenamiento */
      }
    }
    // Subo al servidor los mensajes nuevos ya terminados.
    if (cargada.current) {
      let hasta = guardados.current;
      while (hasta < mensajes.length && !mensajes[hasta].vivo) hasta++;
      if (hasta > guardados.current) {
        const nuevos = mensajes.slice(guardados.current, hasta);
        guardados.current = hasta;
        void fetch("/api/admin/agentes/charla", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agente: a.id, mensajes: nuevos }) }).catch(() => undefined);
      }
    }
    fin.current?.scrollIntoView({ behavior: enCurso ? "auto" : "smooth" });
  }, [mensajes, clave, a.id]);

  const enviar = async (t: string) => {
    const limpio = t.trim();
    if (!limpio || cargando) return;
    const nuevos: Mensaje[] = [...mensajes, { role: "user", content: limpio }];
    setMensajes(nuevos);
    setTexto("");
    setCargando(true);
    setError("");
    try {
      const r = await fetch("/api/admin/agentes/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agente: a.id, mensajes: nuevos.map(({ role, content }) => ({ role, content })) }),
      });
      const d = (await r.json()) as { respuesta?: string; orden?: string | null; error?: string };
      if (!r.ok || !d.respuesta) throw new Error(d.error ?? "No pude responder");
      setMensajes([...nuevos, { role: "assistant", content: d.respuesta, orden: d.orden }]);
      if (voz) void decir(d.respuesta, a.id, manosLibres ? () => escuchar() : undefined);
      if (d.orden) onCambio();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setCargando(false);
    }
  };

  const escuchar = () => {
    if (escuchando) {
      cortarMic.current?.();
      return;
    }
    setError("");
    void escucharVoz(
      (dicho) => {
        if (dicho.trim()) {
          setVoz(true);
          void enviar(dicho);
        }
      },
      (e, detalle) => {
        setEscuchando(e === "escuchando");
        setEstadoVoz(e === "escuchando" ? "Te escucho…" : e === "pensando" ? "Entendiendo…" : "");
        if (e === "error" && detalle) setError(detalle);
      },
    ).then((c) => {
      cortarMic.current = c;
    });
  };

  // Llamada en vivo (como el modo voz de ChatGPT): responde al instante y se lo puede interrumpir.
  const iniciarLlamada = async () => {
    callar();
    cortarMic.current?.();
    setError("");
    llamada.current?.cortar();
    llamada.current = await llamar({
      agente: a.id,
      onEstado: (e, detalle) => {
        setEnVivo(e === "cortada" ? null : e);
        if (e === "error") {
          if (detalle) setError(detalle);
          llamada.current = null;
        }
        if (e === "cortada") llamada.current = null;
      },
      onTexto: (rol, t, final, rid) => {
        // Mientras habla, el texto se refresca 4 veces por segundo (no en cada letra) para no trabar el audio.
        const ahora = performance.now();
        if (rol === "assistant" && !final && ahora - ultimoRefresco.current < 250) return;
        ultimoRefresco.current = ahora;
        setMensajes((prev) => {
          const m = [...prev];
          const ult = m[m.length - 1];
          if (rol === "user") {
            // si el agente ya empezó a contestar, lo que dijo Santiago va antes
            if (ult?.role === "assistant" && ult.vivo && !ult.content) m.splice(m.length - 1, 0, { role: "user", content: t });
            else m.push({ role: "user", content: t });
            return m;
          }
          // Cada respuesta del agente es su propio globo: si dijo «dejame ver» y después contestó, no se pisan.
          const k = rid ? m.map((x) => x.rid).lastIndexOf(rid) : ult?.role === "assistant" && ult.vivo ? m.length - 1 : -1;
          if (k >= 0) m[k] = { ...m[k], content: t, vivo: !final };
          else m.push({ role: "assistant", content: t, vivo: !final, rid });
          return m;
        });
      },
      onAccion: (h, args, ok, resultado) => {
        const que: Record<string, string> = {
          escribir_whatsapp: `le escribí por WhatsApp a ${String(args.telefono ?? "")}`,
          cambiar_estado_pedido: `pasé el pedido #${String(args.id ?? "")} a ${String(args.estado ?? "")}`,
          cambiar_precio_ml: `cambié ${String(args.item ?? "")} a $${Number(args.precio ?? 0).toLocaleString("es-AR")}`,
          cargar_negocios: `cargué ${Array.isArray(args.lista) ? args.lista.length : 0} negocios para la captación`,
        };
        setMensajes((prev) => [...prev, { role: "assistant", content: ok ? `✅ Hecho: ${que[h] ?? h}.` : `⚠️ No pude: ${que[h] ?? h}. ${resultado.slice(0, 160)}` }]);
        onCambio();
      },
      onOrden: (o, para) => {
        const quien = para === a.id ? "" : ` → se la pasé a ${AGENTES.find((x) => x.id === para)?.persona ?? para}`;
        setMensajes((prev) => [...prev, { role: "assistant", content: `Anotado${quien}.`, orden: o }]);
        onCambio();
      },
    });
  };
  const cortarLlamada = () => {
    llamada.current?.cortar();
    llamada.current = null;
    setEnVivo(null);
  };

  const guardar = async () => {
    if (!orden.trim()) return;
    const r = await fetch("/api/admin/agentes/orden", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agente: a.id, texto: orden }) });
    if (r.ok) {
      setOrdenOk(`Listo: ${a.persona} lo va a hacer en su próxima corrida.`);
      setOrden("");
      onCambio();
    } else setOrdenOk("No se pudo guardar. Probá de nuevo.");
  };

  // Manos libres (oficina 3D / TV): al entrar a la oficina arranca la llamada en vivo
  // (o, sin voz natural, el micrófono del navegador).
  useEffect(() => {
    if (!manosLibres) return;
    let cancelado = false;
    const t = setTimeout(() => {
      void hayVozNatural().then((si) => {
        if (cancelado) return;
        if (si) void iniciarLlamada();
        else escuchar();
      });
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(t);
      llamada.current?.cortar();
      llamada.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manosLibres, a.id]);

  const sugerencias = [
    "¿Qué hiciste hoy y qué resultado tuviste?",
    "¿Qué harías para vender más esta semana?",
    "¿Qué necesitás de mí?",
  ];

  const base = tv ? "bg-stone-900 text-white" : "bg-white text-stone-900";
  const suave = tv ? "text-white/60" : "text-stone-500";
  const borde = tv ? "border-white/10" : "border-stone-200";

  return (
    <div className={`fixed inset-0 z-[60] flex justify-end ${angosta ? "pointer-events-none" : "bg-black/50"}`} onClick={onCerrar}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className={`${base} pointer-events-auto flex h-full w-full flex-col shadow-2xl ${angosta ? "bg-stone-900/90 backdrop-blur-md " : ""}${angosta ? "max-w-md" : tv ? "max-w-4xl text-lg" : "max-w-xl"}`}
        role="dialog"
        aria-label={`${a.persona}, ${a.nombre}`}
      >
        <div className={`flex items-center gap-4 border-b ${borde} p-5`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/avatars/${a.id}.svg`} alt="" className={tv ? "h-24 w-24" : "h-16 w-16"} />
          <div className="min-w-0 flex-1">
            <div className={`${tv ? "text-3xl" : "text-xl"} font-semibold`}>{a.persona} {a.emoji}</div>
            <div className={tv ? "text-white/80" : "text-stone-700"}>{a.nombre} · {a.puesto}</div>
            <div className={`text-xs ${suave}`}>{a.horario} · <span className={`inline-block rounded-full px-2 py-0.5 font-medium ${PILDORA[a.estado]}`}>{a.estadoTexto}</span></div>
          </div>
          <button onClick={onCerrar} className={`rounded-full px-3 py-1 text-2xl ${suave}`} aria-label="Cerrar">×</button>
        </div>

        <nav className={`flex gap-1 border-b ${borde} px-3 text-sm`}>
          {(["hablar", "informes", "ordenes", "perfil"] as const).map((p) => (
            <button key={p} onClick={() => setPestana(p)} className={`px-3 py-2 capitalize ${pestana === p ? "border-b-2 border-acopio-500 font-semibold" : suave}`}>
              {p === "hablar" ? "💬 Hablar" : p === "informes" ? `📋 Informes (${a.informes.length})` : p === "ordenes" ? `📌 Órdenes (${a.ordenes.length})` : "👤 Perfil"}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {pestana === "hablar" ? (
            <div className="space-y-3">
              {mensajes.length === 0 ? (
                <div className={`text-sm ${suave}`}>
                  <p>Hablale a {a.persona} como a alguien del equipo: preguntale cómo viene, pedile ideas o dale una orden («desde mañana…»). Las órdenes quedan guardadas y las hace en su próxima corrida.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sugerencias.map((s) => (
                      <button key={s} onClick={() => void enviar(s)} className={`rounded-full border ${borde} px-3 py-1 text-left ${tv ? "hover:bg-white/10" : "hover:bg-stone-50"}`}>{s}</button>
                    ))}
                  </div>
                </div>
              ) : null}
              {mensajes.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 ${m.role === "user" ? "bg-acopio-700 text-white" : tv ? "bg-white/10" : "bg-stone-100"}`}>
                    {m.content.replace(/\*\*/g, "")}
                    {m.orden ? <div className="mt-2 rounded-lg bg-amber-100 px-2 py-1 text-xs text-amber-900">📌 Orden guardada: {m.orden}</div> : null}
                  </div>
                </div>
              ))}
              {estadoVoz ? <div className="text-sm text-amber-400">🎙️ {estadoVoz}</div> : null}
              {enVivo ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${enVivo === "hablando" ? "bg-acopio-500 animate-pulse" : enVivo === "escuchando" ? "bg-red-500 animate-pulse" : "bg-amber-400"}`} />
                  <span className={suave}>
                    {enVivo === "conectando" ? `Llamando a ${a.persona}…` : enVivo === "hablando" ? `${a.persona} está hablando · podés interrumpir cuando quieras` : enVivo === "pensando" ? `${a.persona} está pensando…` : enVivo === "error" ? "Se cortó la llamada" : "En vivo · hablá cuando quieras"}
                  </span>
                </div>
              ) : null}
              {cargando ? <div className={`text-sm ${suave}`}>{a.persona} está pensando…</div> : null}
              {error ? <div className="text-sm text-red-500">{error}</div> : null}
              <div ref={fin} />
            </div>
          ) : null}

          {pestana === "informes" ? (
            <div className="space-y-3">
              {a.informes.length === 0 ? <p className={`text-sm ${suave}`}>Todavía no dejó informes. Trabaja {a.horario.toLowerCase()}.</p> : null}
              {a.informes.map((i, n) => (
                <details key={n} open={n === 0} className={`rounded-xl border ${borde} p-3`}>
                  <summary className="cursor-pointer text-sm font-medium">{i.cuando}{i.ok ? "" : " · ⚠️ con problemas"}</summary>
                  <p className={`mt-2 whitespace-pre-wrap text-sm ${tv ? "text-white/85" : "text-stone-700"}`}>{i.texto}</p>
                </details>
              ))}
            </div>
          ) : null}

          {pestana === "ordenes" ? (
            <div className="space-y-3">
              <textarea
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                rows={3}
                placeholder={`¿Qué querés que haga ${a.persona}? Ej.: «esta semana priorizá gimnasios de Carlos Paz»`}
                className={`w-full rounded-xl border ${borde} p-3 text-sm ${tv ? "bg-white/5" : ""}`}
              />
              <button onClick={() => void guardar()} className="rounded-full bg-acopio-700 px-4 py-2 text-sm text-white">Guardar orden</button>
              {ordenOk ? <p className={`text-sm ${suave}`}>{ordenOk}</p> : null}
              <ul className="space-y-2">
                {a.ordenes.map((o, n) => (
                  <li key={n} className={`rounded-xl border ${borde} p-3 text-sm`}>
                    <div className={`text-xs ${suave}`}>{o.cuando}</div>
                    {o.texto}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {pestana === "perfil" ? (
            <div className="space-y-3 text-sm">
              <p><b>Misión:</b> {a.mision}</p>
              <div>
                <b>Qué hace:</b>
                <ul className="mt-1 list-disc pl-5">{a.hace.map((h) => <li key={h}>{h}</li>)}</ul>
              </div>
              <p><b>Se mide por:</b> {a.mide}</p>
              <p><b>Horario:</b> {a.horario}</p>
            </div>
          ) : null}
        </div>

        {pestana === "hablar" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void enviar(texto);
            }}
            className={`flex items-center gap-2 border-t ${borde} p-3`}
          >
            <button
              type="button"
              onClick={() => (enVivo ? cortarLlamada() : void iniciarLlamada())}
              title={enVivo ? "Cortar la llamada" : "Llamada en vivo"}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${enVivo ? "bg-red-500 text-white" : "bg-acopio-700 text-white"}`}
            >
              {enVivo ? "Cortar" : "📞 En vivo"}
            </button>
            <button type="button" onClick={escuchar} title="Dictar un mensaje" className={`rounded-full px-3 py-2 text-lg ${escuchando ? "bg-red-500 text-white animate-pulse" : tv ? "bg-white/10" : "bg-stone-100"}`}>🎙️</button>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={`Escribile a ${a.persona}…`}
              className={`min-w-0 flex-1 rounded-full border ${borde} px-4 py-2 text-sm ${tv ? "bg-white/5" : ""}`}
            />
            <button type="button" onClick={() => setVoz((v) => !v)} title="Que lea las respuestas en voz alta" className={`rounded-full px-3 py-2 ${voz ? "bg-acopio-100 text-acopio-900" : tv ? "bg-white/10" : "bg-stone-100"}`}>{voz ? "🔊" : "🔈"}</button>
            <button disabled={cargando} className="rounded-full bg-acopio-700 px-4 py-2 text-sm text-white disabled:opacity-50">Enviar</button>
          </form>
        ) : null}
      </aside>
    </div>
  );
}
