"use client";

import { useEffect, useState } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const CLAVE = "acopio-app-aviso";
let guardado: EventoInstalar | null = null;

function leer(): { visitas: number; cerrado: number } {
  try { return { visitas: 0, cerrado: 0, ...JSON.parse(localStorage.getItem(CLAVE) || "{}") }; } catch { return { visitas: 0, cerrado: 0 }; }
}
function escribir(v: { visitas: number; cerrado: number }) {
  try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch {}
}

/** Estado de instalación: solo en celular, nunca si ya está instalada. */
function useInstalacion() {
  const [estado, setEstado] = useState<{ movil: boolean; instalada: boolean; ios: boolean; puedeInstalar: boolean }>({ movil: false, instalada: true, ios: false, puedeInstalar: false });
  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const instalada = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const movil = window.matchMedia("(max-width: 767px) and (pointer: coarse)").matches;
    setEstado({ movil, instalada, ios, puedeInstalar: !!guardado });
    const alOfrecer = (e: Event) => { e.preventDefault(); guardado = e as EventoInstalar; setEstado((s) => ({ ...s, puedeInstalar: true })); };
    const alInstalar = () => { guardado = null; setEstado((s) => ({ ...s, instalada: true })); };
    window.addEventListener("beforeinstallprompt", alOfrecer);
    window.addEventListener("appinstalled", alInstalar);
    return () => { window.removeEventListener("beforeinstallprompt", alOfrecer); window.removeEventListener("appinstalled", alInstalar); };
  }, []);
  const instalar = async () => { if (!guardado) return false; await guardado.prompt(); const r = await guardado.userChoice; guardado = null; setEstado((s) => ({ ...s, puedeInstalar: false })); return r.outcome === "accepted"; };
  return { ...estado, instalar };
}

const Compartir = () => (
  <svg viewBox="0 0 24 24" className="inline h-5 w-5 align-[-4px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3m0 0L8 7m4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" /></svg>
);

export function PasosInstalar({ ios }: { ios: boolean }) {
  const pasos = ios
    ? [<>Tocá <b>Compartir</b> <Compartir /> en la barra de Safari.</>, <>Elegí <b>Agregar a inicio</b>.</>, <>Confirmá con <b>Agregar</b>. Listo: Acopio queda con su ícono.</>]
    : [<>Abrí el menú <b>⋮</b> de Chrome, arriba a la derecha.</>, <>Elegí <b>Agregar a pantalla principal</b> o <b>Instalar app</b>.</>, <>Confirmá con <b>Instalar</b>. Listo: Acopio queda con su ícono.</>];
  return (
    <ol className="space-y-2.5">
      {pasos.map((p, i) => (
        <li key={i} className="flex items-start gap-3 text-sm"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-acopio-900 text-xs font-bold text-white">{i + 1}</span><span className="pt-1">{p}</span></li>
      ))}
    </ol>
  );
}

/**
 * Invitación a instalar: solo en celular, en línea con el contenido (nunca tapa nada), a partir de la segunda visita
 * o apenas termina una compra. Si la cierran, no vuelve por 60 días.
 */
export function InstalarApp({ momento = "visita", className = "" }: { momento?: "visita" | "compra"; className?: string }) {
  const { movil, instalada, ios, puedeInstalar, instalar } = useInstalacion();
  const [visible, setVisible] = useState(false);
  const [pasos, setPasos] = useState(false);
  useEffect(() => {
    const v = leer();
    if (momento === "visita" && !sessionStorage.getItem(CLAVE)) { try { sessionStorage.setItem(CLAVE, "1"); } catch {} v.visitas += 1; escribir(v); }
    const descansando = Date.now() - v.cerrado < 60 * 86400000;
    setVisible(!descansando && (momento === "compra" || v.visitas >= 2));
  }, [momento]);
  if (!movil || instalada || !visible) return null;
  const cerrar = () => { escribir({ ...leer(), cerrado: Date.now() }); setVisible(false); };
  return (
    <aside aria-label="Instalar la app" className={`rounded-2xl bg-white p-4 shadow-ficha ${className}`}>
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icono-192.png" alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold leading-tight">{momento === "compra" ? "Tené tu próximo pedido a un toque" : "Llevá Acopio en tu celular"}</p>
          <p className="mt-0.5 text-sm text-stone-600">Se abre como una app, sin descargar nada de la tienda. No ocupa espacio.</p>
        </div>
        <button type="button" onClick={cerrar} aria-label="Cerrar" className="-mr-2 -mt-2 flex h-12 w-12 shrink-0 items-center justify-center text-xl text-stone-500">×</button>
      </div>
      {pasos ? <div className="mt-3 border-t border-tierra-200 pt-3"><PasosInstalar ios={ios} /></div> : (
        <button type="button" className="btn-sec mt-3 w-full" onClick={async () => { if (puedeInstalar) { if (await instalar()) setVisible(false); } else setPasos(true); }}>{puedeInstalar ? "Instalar" : "Ver cómo se instala"}</button>
      )}
    </aside>
  );
}

/** Para la página /app: botón directo si el navegador lo permite, y los pasos del sistema que corresponda. */
export function InstalarEnPagina() {
  const { instalada, ios, puedeInstalar, instalar } = useInstalacion();
  const [listo, setListo] = useState(false);
  useEffect(() => setListo(true), []);
  if (listo && instalada) return <p className="rounded-2xl bg-acopio-100 p-4 text-sm font-semibold text-acopio-900">Ya la tenés instalada en este dispositivo.</p>;
  return (
    <div className="space-y-6">
      {puedeInstalar && <button type="button" className="btn-comprar w-full sm:w-auto" onClick={() => instalar()}>Instalar ahora</button>}
      <div className="grid gap-4 sm:grid-cols-2">
        {[true, false].map((esIos) => (
          <section key={String(esIos)} className={`rounded-2xl bg-white p-5 shadow-ficha ${listo && esIos === ios ? "ring-2 ring-acopio-600" : ""}`}>
            <h2 className="mb-3 font-display text-lg font-bold">{esIos ? "En iPhone (Safari)" : "En Android (Chrome)"}</h2>
            <PasosInstalar ios={esIos} />
          </section>
        ))}
      </div>
    </div>
  );
}
