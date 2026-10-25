"use client";

// Pantalla de llamada en el celular (estilo FaceTime / modo voz): la persona en grande con un halo que
// respira con su voz, lo último que dijo como subtítulo, y dos botones: silenciar y cortar.
import { useEffect, useRef, useState } from "react";
import type { EstadoLlamada } from "./en-vivo";

const TEXTO: Record<EstadoLlamada, string> = {
  conectando: "Llamando…",
  escuchando: "Te escucho",
  pensando: "Pensando",
  hablando: "Hablando",
  cortada: "Llamada terminada",
  error: "Se cortó la llamada",
};

export function PantallaLlamada({
  agente,
  persona,
  puesto,
  estado,
  subtitulo,
  tuyo,
  silenciado,
  onSilenciar,
  onCortar,
  onChat,
}: {
  agente: string;
  persona: string;
  puesto: string;
  estado: EstadoLlamada;
  subtitulo: string;
  tuyo: string;
  silenciado: boolean;
  onSilenciar: () => void;
  onCortar: () => void;
  onChat: () => void;
}) {
  const halo = useRef<HTMLDivElement>(null);
  const [segundos, setSegundos] = useState(0);

  // El halo sigue el volumen de la voz del agente (evento «acopio-boca»), suavizado.
  useEffect(() => {
    let nivel = 0;
    let objetivo = 0;
    let raf = 0;
    const al = (e: Event) => {
      const d = (e as CustomEvent<{ agente: string; nivel: number }>).detail;
      if (d?.agente === agente) objetivo = d.nivel;
    };
    const paso = () => {
      nivel += (objetivo - nivel) * 0.18;
      objetivo *= 0.92;
      if (halo.current) {
        halo.current.style.transform = `scale(${1 + nivel * 0.35})`;
        halo.current.style.opacity = String(0.25 + nivel * 0.75);
      }
      raf = requestAnimationFrame(paso);
    };
    window.addEventListener("acopio-boca", al);
    raf = requestAnimationFrame(paso);
    return () => {
      window.removeEventListener("acopio-boca", al);
      cancelAnimationFrame(raf);
    };
  }, [agente]);

  useEffect(() => {
    if (estado === "conectando") return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [estado]);

  const reloj = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
  const escuchando = estado === "escuchando";

  return (
    <div onClick={(e) => e.stopPropagation()} className="fixed inset-0 z-[70] flex flex-col items-center overflow-hidden bg-gradient-to-b from-[#0f3d2c] via-[#0b2a20] to-[#05140f] px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] text-white">
      <style>{"@keyframes llRespira{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}} @keyframes llEntra{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}} @keyframes llPunto{0%,80%,100%{opacity:.25}40%{opacity:1}}"}</style>

      <div className="text-center">
        <div className="text-[15px] font-medium tracking-wide text-white/60">{estado === "conectando" ? "Llamada de voz" : reloj}</div>
        <div className="mt-1 text-[34px] font-semibold leading-tight tracking-tight">{persona}</div>
        <div className="text-[15px] text-white/60">{puesto}</div>
      </div>

      <div className="relative mt-10 grid place-items-center">
        <div ref={halo} className="absolute h-56 w-56 rounded-full bg-amber-300/60 blur-2xl transition-none" />
        <div className={`absolute h-56 w-56 rounded-full border ${escuchando ? "border-white/40" : "border-white/10"} transition-colors duration-500`} style={{ animation: "llRespira 3.5s ease-in-out infinite" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/avatars/${agente}.svg`} alt="" className="relative h-44 w-44 rounded-full bg-white shadow-2xl" />
      </div>

      <div className="mt-8 flex h-7 items-center gap-1 text-[17px] font-medium text-amber-300">
        {silenciado ? "Micrófono apagado" : TEXTO[estado]}
        {estado === "pensando" || estado === "conectando" ? (
          <span>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ animation: `llPunto 1.2s ${i * 0.2}s infinite` }}>.</span>
            ))}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex min-h-0 w-full max-w-md flex-1 flex-col justify-end gap-3 overflow-hidden">
        {tuyo ? <p key={`u-${tuyo.slice(0, 20)}`} className="self-end rounded-3xl bg-white/10 px-4 py-2 text-[15px] text-white/80" style={{ animation: "llEntra .35s ease-out" }}>{tuyo}</p> : null}
        {subtitulo ? (
          <p key={`a-${subtitulo.slice(0, 12)}`} className="line-clamp-6 text-center text-[21px] font-medium leading-snug text-white" style={{ animation: "llEntra .35s ease-out" }}>
            {subtitulo}
          </p>
        ) : null}
      </div>

      <div className="mt-8 flex w-full max-w-xs items-center justify-between">
        <Boton etiqueta={silenciado ? "Activar" : "Silenciar"} onClick={onSilenciar} activo={silenciado}>
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            {silenciado ? <path d="M4 4l16 16" /> : null}
          </svg>
        </Boton>
        <Boton etiqueta="Cortar" onClick={onCortar} rojo>
          <svg viewBox="0 0 24 24" className="h-8 w-8 rotate-[135deg]" fill="currentColor" aria-hidden>
            <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z" />
          </svg>
        </Boton>
        <Boton etiqueta="Chat" onClick={onChat}>
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
            <path d="M4 5h16v11H8l-4 4V5Z" />
          </svg>
        </Boton>
      </div>
    </div>
  );
}

function Boton({ etiqueta, onClick, rojo = false, activo = false, children }: { etiqueta: string; onClick: () => void; rojo?: boolean; activo?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2" aria-label={etiqueta}>
      <span className={`grid h-[72px] w-[72px] place-items-center rounded-full transition active:scale-95 ${rojo ? "bg-[#ff3b30] text-white" : activo ? "bg-white text-stone-900" : "bg-white/15 text-white backdrop-blur"}`}>{children}</span>
      <span className="text-[13px] text-white/70">{etiqueta}</span>
    </button>
  );
}
