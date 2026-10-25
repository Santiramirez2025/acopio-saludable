"use client";

// La oficina 3D (la escena vive en ./escena.ts). Acá van los controles, el cartel de «hablar con…»,
// el mapa de oficinas, la transmisión a la TV y la charla con voz (Ficha en modo manos libres).

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ficha, type AgenteVista, type DatosOficina } from "../oficina";
import type { Control } from "./escena";
import { BotonTv } from "../boton-tv";
import { SeguirCelular } from "@/app/tv/seguir-celular";

const COLOR_ESTADO: Record<AgenteVista["estado"], string> = { ok: "#22c55e", falla: "#ef4444", atrasado: "#f59e0b", pendiente: "#38bdf8", descanso: "#9ca3af" };

function ultimaLinea(a: AgenteVista): string {
  return a.informes[0]?.texto.split("\n").map((l) => l.replace(/^[#*\-•\s]+/, "").trim()).find((l) => l.length > 10) ?? a.mision;
}

export function Oficina3D({ datos, enTv = false }: { datos: DatosOficina; enTv?: boolean }) {
  const router = useRouter();
  const lienzo = useRef<HTMLDivElement>(null);
  const ctl = useRef<Control | null>(null);
  const [cerca, setCerca] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [mapa, setMapa] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState("");
  const abiertoRef = useRef<string | null>(null);
  const cercaRef = useRef<string | null>(null);
  abiertoRef.current = abierto;
  cercaRef.current = cerca;
  const porId = (id: string | null) => datos.agentes.find((a) => a.id === id) ?? null;

  // La escena se arma una sola vez (los datos nuevos llegan al recargar la página).
  const datosIniciales = useRef(datos);
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { crearEscena } = await import("./escena");
        if (!vivo || !lienzo.current) return;
        const d = datosIniciales.current;
        const tv = enTv || new URLSearchParams(window.location.search).get("tv") === "1";
        const c = await crearEscena(
          lienzo.current,
          {
            agentes: d.agentes.map((a) => ({ id: a.id, persona: a.persona, nombre: a.nombre, area: a.area, emoji: a.emoji, estado: a.estado, estadoTexto: a.estadoTexto, ultimo: a.id === "logistica" && d.armado ? d.armado : ultimaLinea(a) })),
            areas: d.areas.map((a) => a.id),
            kpis: d.kpis,
            hoy: d.hoy,
            hora: d.hora,
            temporada: d.temporada,
          },
          { cerca: setCerca, tocar: (id) => setAbierto(id), listo: () => setCargado(true), progreso: setProgreso },
          { tv, liviano: enTv || new URLSearchParams(window.location.search).get("liviano") === "1" },
        );
        if (!vivo) return c.destruir();
        ctl.current = c;
      } catch (e) {
        setError(String(e instanceof Error ? e.message : e));
      }
    })();
    return () => {
      vivo = false;
      ctl.current?.destruir();
      ctl.current = null;
    };
  }, []);

  useEffect(() => {
    ctl.current?.enfocar(abierto);
  }, [abierto]);

  // Recorrido automático (para dejarlo en la TV): si nadie toca nada por 25 s, la cámara va
  // pasando por cada oficina y muestra qué hizo cada persona. Cualquier tecla o toque lo corta.
  const [recorrido, setRecorrido] = useState<string | null>(null);
  const quieto = useRef(Date.now());
  useEffect(() => {
    const mover = () => {
      quieto.current = Date.now();
      setRecorrido((r) => (r ? null : r));
    };
    window.addEventListener("pointerdown", mover);
    window.addEventListener("keydown", mover);
    let n = 0;
    const t = setInterval(() => {
      if (!cargado || abiertoRef.current || mapa) return;
      if (Date.now() - quieto.current < (enTv ? 4_000 : 25_000)) return;
      const lista = datos.agentes;
      const a = lista[n % lista.length];
      n++;
      setRecorrido(a.id);
      ctl.current?.irA(a.id, false);
    }, enTv ? 10_000 : 12_000);
    return () => {
      clearInterval(t);
      window.removeEventListener("pointerdown", mover);
      window.removeEventListener("keydown", mover);
    };
  }, [cargado, mapa, datos.agentes, enTv]);
  const enRecorrido = porId(recorrido);

  // En la TV: ir a la oficina que se pidió desde el celular (o por ?agente=) y quedarse ahí un minuto.
  const irAgente = useCallback((id: string) => {
    quieto.current = Date.now() + 60_000;
    setRecorrido(id);
    ctl.current?.irA(id, false);
  }, []);
  useEffect(() => {
    if (!cargado) return;
    const id = new URLSearchParams(window.location.search).get("agente");
    if (id && datos.agentes.some((x) => x.id === id)) irAgente(id);
  }, [cargado, datos.agentes, irAgente]);

  // Teclado y control remoto.
  const tecla = useCallback((e: KeyboardEvent, baja: boolean) => {
    const enCampo = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName);
    if (abiertoRef.current) {
      if (baja && e.key === "Escape") setAbierto(null);
      return;
    }
    if (enCampo || !ctl.current) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "q", "e", "Shift"].includes(k)) {
      e.preventDefault();
      if (baja) ctl.current.teclas.add(k);
      else ctl.current.teclas.delete(k);
    }
    if (baja && (e.key === "Enter" || e.key === " ") && cercaRef.current) {
      e.preventDefault();
      ctl.current.teclas.clear();
      ctl.current.irA(cercaRef.current, true);
    }
    if (baja && k === "m") setMapa((m) => !m);
  }, []);
  useEffect(() => {
    const d = (e: KeyboardEvent) => tecla(e, true);
    const u = (e: KeyboardEvent) => tecla(e, false);
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);
    return () => {
      window.removeEventListener("keydown", d);
      window.removeEventListener("keyup", u);
    };
  }, [tecla]);

  const boton = (k: string, txt: string) => (
    <button
      onPointerDown={() => ctl.current?.teclas.add(k)}
      onPointerUp={() => ctl.current?.teclas.delete(k)}
      onPointerLeave={() => ctl.current?.teclas.delete(k)}
      className="h-14 w-14 rounded-2xl bg-black/35 text-2xl text-white backdrop-blur active:bg-black/55"
      aria-label={txt}
    >
      {txt}
    </button>
  );

  const a = porId(abierto);
  const c = porId(cerca);

  return (
    <div className="fixed inset-0 z-50 bg-stone-200">
      <div ref={lienzo} className="absolute inset-0" />
      {enTv ? <SeguirCelular actual="3d" onAgente={irAgente} /> : null}

      {!cargado ? (
        <div className="absolute inset-0 grid place-items-center bg-[#0b2a20] text-white">
          <div className="w-72 text-center">
            <div className="text-3xl font-black">Acopio.</div>
            <div className="mt-1 text-sm text-white/70">{error ? `No se pudo abrir la oficina: ${error}` : "Abriendo la oficina…"}</div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.round(progreso * 100)}%` }} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:p-4">
        <div className="pointer-events-auto min-w-0 rounded-2xl bg-black/40 px-3 py-2 text-white backdrop-blur-md sm:px-4">
          <div className="text-sm font-semibold">Acopio · La empresa</div>
          <div className="hidden text-xs text-white/70 sm:block">{enTv ? "Manejala desde el celular: panel → TV → «Mostrar en la TV»" : "Flechas o WASD para caminar · Shift corre · arrastrá para mirar · tocá a alguien o OK para hablarle · M oficinas"}</div>
          <div className="text-xs text-white/70 sm:hidden">Tocá a alguien para hablarle</div>
        </div>
        <div className="pointer-events-auto flex shrink-0 gap-1.5 sm:gap-2">
          <button onClick={() => setMapa((m) => !m)} aria-label="Oficinas" className="rounded-full bg-black/40 px-3 py-2 text-sm text-white backdrop-blur-md sm:px-4">🗺️<span className="hidden sm:inline"> Oficinas</span></button>
          <a href={enTv ? "/tv/armado" : "/admin/empresa/armado"} aria-label="Pizarra de armado" className="rounded-full bg-black/40 px-3 py-2 text-sm text-white backdrop-blur-md sm:px-4">📦<span className="hidden sm:inline"> Pizarra de armado</span></a>
          {enTv ? null : <a href="/admin/empresa/mensajes" aria-label="Mensajes en vivo" className="rounded-full bg-black/40 px-3 py-2 text-sm text-white backdrop-blur-md sm:px-4">💬<span className="hidden sm:inline"> Mensajes</span></a>}
          {enTv ? null : <BotonTv />}
          <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)} className="hidden rounded-full bg-black/40 px-4 py-2 text-sm text-white backdrop-blur-md sm:block">⛶</button>
          {enTv ? null : <a href="/admin/empresa" aria-label="Salir" className="rounded-full bg-black/40 px-3 py-2 text-sm text-white backdrop-blur-md sm:px-4">✕</a>}
        </div>
      </div>

      {enRecorrido && !a ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-28 rounded-3xl bg-black/55 p-4 text-white shadow-2xl backdrop-blur-md sm:inset-x-auto sm:bottom-8 sm:left-8 sm:max-w-xl sm:p-5">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/avatars/${enRecorrido.id}.svg`} alt="" className="h-12 w-12 rounded-full bg-white/90 sm:h-16 sm:w-16" />
            <div>
              <div className="text-xl font-bold sm:text-2xl">{enRecorrido.persona} {enRecorrido.emoji}</div>
              <div className="text-white/70">{enRecorrido.nombre} · {enRecorrido.estadoTexto}</div>
            </div>
          </div>
          <p className="mt-2 line-clamp-3 text-base text-white/90 sm:mt-3 sm:text-lg">{ultimaLinea(enRecorrido)}</p>
        </div>
      ) : null}

      {c && !a && !enRecorrido ? (
        <button
          onClick={() => ctl.current?.irA(c.id, true)}
          className="absolute bottom-24 left-1/2 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-3 rounded-full bg-white/95 py-2 pl-2 pr-5 text-stone-900 shadow-2xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/avatars/${c.id}.svg`} alt="" className="h-12 w-12" />
          <span className="text-left">
            <span className="block font-semibold">🎙️ Hablar con {c.persona}</span>
            <span className="block text-xs text-stone-500">{c.nombre} · {c.estadoTexto} · OK / Enter</span>
          </span>
        </button>
      ) : null}

      {!a && !enTv ? (
        <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-2">
          <span />
          {boton("ArrowUp", "▲")}
          <span />
          {boton("ArrowLeft", "◀")}
          {boton("ArrowDown", "▼")}
          {boton("ArrowRight", "▶")}
        </div>
      ) : null}

      {mapa ? (
        <div className="absolute right-3 top-16 max-h-[75vh] w-[min(20rem,calc(100vw-24px))] overflow-y-auto sm:right-4 sm:top-20 rounded-2xl bg-black/70 p-3 text-white backdrop-blur-md">
          <div className="mb-2 text-sm font-semibold">Ir a la oficina de…</div>
          {datos.agentes.map((x) => (
            <button
              key={x.id}
              onClick={() => {
                ctl.current?.irA(x.id, false);
                setMapa(false);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/avatars/${x.id}.svg`} alt="" className="h-8 w-8" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{x.persona} {x.emoji}</span>
                <span className="block truncate text-xs text-white/60">{x.nombre}</span>
              </span>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_ESTADO[x.estado] }} />
            </button>
          ))}
        </div>
      ) : null}

      {a ? <Ficha a={a} tv onCerrar={() => setAbierto(null)} onCambio={() => router.refresh()} manosLibres angosta /> : null}
    </div>
  );
}
