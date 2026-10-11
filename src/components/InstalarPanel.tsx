"use client";

import { useEffect, useState } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const CLAVE = "acopio-panel-instalar";

/**
 * Aviso para instalar el panel como app en el celular.
 *
 * No es el mismo que el de la tienda: ese ofrece la app del cliente y este la del panel,
 * que son dos aplicaciones distintas con manifest e icono propios. Aparece solo en celular,
 * desaparece cuando ya está instalada, y se puede cerrar para siempre.
 */
export function InstalarPanel() {
  const [estado, setEstado] = useState<{ mostrar: boolean; ios: boolean; prompt: EventoInstalar | null }>({ mostrar: false, ios: false, prompt: null });

  useEffect(() => {
    try {
      if (localStorage.getItem(CLAVE) === "cerrado") return;
    } catch {}
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const instalada = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const movil = window.matchMedia("(max-width: 767px) and (pointer: coarse)").matches;
    if (instalada || !movil) return;
    // En iPhone no existe el evento de instalación: se explica el paso a mano.
    if (ios) setEstado({ mostrar: true, ios: true, prompt: null });
    const alOfrecer = (e: Event) => {
      e.preventDefault();
      setEstado({ mostrar: true, ios: false, prompt: e as EventoInstalar });
    };
    window.addEventListener("beforeinstallprompt", alOfrecer);
    return () => window.removeEventListener("beforeinstallprompt", alOfrecer);
  }, []);

  if (!estado.mostrar) return null;

  const cerrar = () => {
    try { localStorage.setItem(CLAVE, "cerrado"); } catch {}
    setEstado((s) => ({ ...s, mostrar: false }));
  };

  return (
    <div className="border-b border-acopio-600/30 bg-acopio-100 px-4 py-2.5 text-sm text-acopio-900 print:hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1">
          <b>Tené el panel a mano.</b>{" "}
          {estado.ios ? "Tocá Compartir y después “Agregar a inicio”: queda como una app aparte de la tienda." : "Instalalo como app y abrís los pedidos de un toque."}
        </span>
        {!estado.ios && estado.prompt && (
          <button
            type="button"
            className="btn px-4 py-1.5"
            onClick={async () => {
              await estado.prompt?.prompt();
              cerrar();
            }}
          >
            Instalar
          </button>
        )}
        <button type="button" className="text-xs underline" onClick={cerrar}>No, gracias</button>
      </div>
    </div>
  );
}
