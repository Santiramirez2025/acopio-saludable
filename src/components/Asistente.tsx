"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Foto } from "./Foto";

type Enlace = { href: string; texto: string; externo?: boolean };
type Ficha = { href: string; nombre: string; detalle: string; precio: string; foto: string | null };
type Mensaje = { de: "yo" | "acopio"; texto: string; enlaces?: Enlace[]; fichas?: Ficha[]; aviso?: string };

const BIENVENIDA: Mensaje = { de: "acopio", texto: "Hola. Te busco un producto o te cuento sobre envíos, pagos y la compra mínima. ¿Qué necesitás?" };
const ATAJOS = ["¿Cuánto tarda el envío?", "¿Cómo puedo pagar?", "¿Hay compra mínima?", "Productos sin TACC", "Hablar con una persona"];
const CLAVE = "acopio-asistente";

/** Ayuda de la tienda: un botón en el encabezado que abre una conversación. Nunca se abre sola ni tapa la compra. */
export function Asistente() {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([BIENVENIDA]);
  const [texto, setTexto] = useState("");
  const [esperando, setEsperando] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const previo = JSON.parse(sessionStorage.getItem(CLAVE) || "null");
      if (Array.isArray(previo) && previo.length) setMensajes(previo);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(mensajes.slice(-30)));
    } catch {}
    fin.current?.scrollIntoView({ block: "end" });
  }, [mensajes, abierto, esperando]);
  // Al tocar un resultado se navega: la ayuda se cierra sola para dejar ver la página.
  useEffect(() => setAbierto(false), [ruta]);
  useEffect(() => {
    if (!abierto) return;
    if (window.matchMedia("(pointer: fine)").matches) campo.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierto]);

  async function enviar(pregunta: string) {
    const mensaje = pregunta.trim().slice(0, 200);
    if (!mensaje || esperando) return;
    setTexto("");
    setMensajes((m) => [...m, { de: "yo", texto: mensaje }]);
    setEsperando(true);
    try {
      const r = await fetch("/api/asistente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensaje }) });
      if (!r.ok) throw new Error();
      const datos = await r.json();
      setMensajes((m) => [...m, { de: "acopio", ...datos }]);
    } catch {
      setMensajes((m) => [...m, { de: "acopio", texto: "No pude responder ahora. Probá de nuevo en un momento o escribinos.", enlaces: [{ href: "/contacto", texto: "Ver datos de contacto" }] }]);
    } finally {
      setEsperando(false);
    }
  }

  return (
    <>
      <button ref={boton} type="button" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} aria-controls="asistente" className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white/15 px-3 text-sm font-semibold text-white hover:bg-white/25 md:px-4">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5.5h16v10.5H10.5L6 19.5V16H4zM8.5 9.5h7M8.5 12.5h4.5" /></svg>
        <span className="sr-only md:not-sr-only">Ayuda</span>
      </button>

      {/* Va colgado del body: dentro del encabezado quedaría por debajo de la barra inferior del celular. */}
      {abierto && createPortal(
        <>
          <button type="button" aria-label="Cerrar la ayuda" tabIndex={-1} onClick={() => setAbierto(false)} className="fixed inset-0 z-40 cursor-default bg-acopio-900/40 md:bg-transparent" />
          <section id="asistente" role="dialog" aria-label="Ayuda de Acopio Saludable" className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl bg-white text-acopio-900 shadow-dock md:inset-x-auto md:bottom-auto md:right-5 md:top-[76px] md:max-h-[min(620px,calc(100dvh-96px))] md:w-[380px] md:rounded-3xl md:border md:border-tierra-200 md:shadow-2xl">
            <header className="flex items-center gap-3 border-b border-tierra-200 px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-bold leading-tight">¿Te ayudamos?</h2>
                <p className="text-xs text-stone-600">Asistente automático. Responde al instante.</p>
              </div>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full text-stone-600 hover:bg-acopio-50">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
              {mensajes.map((m, i) =>
                m.de === "yo" ? (
                  <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-acopio-900 px-3.5 py-2.5 text-[15px] text-white">{m.texto}</p>
                ) : (
                  <div key={i} className="max-w-[92%] space-y-2">
                    <p className="w-fit whitespace-pre-line rounded-2xl rounded-bl-md bg-acopio-50 px-3.5 py-2.5 text-[15px] leading-snug">{m.texto}</p>
                    {m.fichas?.map((f) => (
                      <Link key={f.href} href={f.href} className="flex items-center gap-3 rounded-2xl border border-tierra-200 bg-white p-2 pr-3 hover:border-acopio-600">
                        <Foto src={f.foto} alt="" className="h-14 w-14 shrink-0 rounded-xl" sizes="56px" />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-sm font-semibold leading-tight">{f.nombre}</span>
                          {f.detalle && <span className="block truncate text-xs text-stone-600">{f.detalle}</span>}
                        </span>
                        <span className="shrink-0 text-sm font-bold tabular-nums">{f.precio}</span>
                      </Link>
                    ))}
                    {m.enlaces && (
                      <div className="flex flex-wrap gap-2">
                        {m.enlaces.map((e) =>
                          e.externo ? (
                            <a key={e.href} href={e.href} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center rounded-full border border-acopio-600 px-4 text-sm font-semibold text-acopio-700 hover:bg-acopio-50">{e.texto}</a>
                          ) : (
                            <Link key={e.href} href={e.href} className="flex min-h-[44px] items-center rounded-full border border-acopio-600 px-4 text-sm font-semibold text-acopio-700 hover:bg-acopio-50">{e.texto}</Link>
                          ),
                        )}
                      </div>
                    )}
                    {m.aviso && <p className="text-xs text-stone-600">{m.aviso}</p>}
                  </div>
                ),
              )}
              {esperando && <p className="w-fit rounded-2xl rounded-bl-md bg-acopio-50 px-3.5 py-2.5 text-[15px] text-stone-600">Buscando…</p>}
              <div ref={fin} />
            </div>

            <div className="border-t border-tierra-200 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
              <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
                {ATAJOS.map((a) => (
                  <button key={a} type="button" onClick={() => enviar(a)} disabled={esperando} className="flex min-h-[40px] shrink-0 items-center rounded-full bg-acopio-50 px-3.5 text-sm font-medium text-acopio-700 hover:bg-acopio-100 disabled:opacity-50">{a}</button>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className="flex gap-2">
                <input ref={campo} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} enterKeyHint="send" autoComplete="off" placeholder="Escribí tu consulta o un producto" aria-label="Tu consulta" className="campo flex-1 rounded-full" />
                <button type="submit" disabled={esperando || !texto.trim()} aria-label="Enviar" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-acopio-900 text-white hover:bg-acopio-700 disabled:opacity-40">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </form>
            </div>
          </section>
        </>,
        document.body,
      )}
    </>
  );
}
