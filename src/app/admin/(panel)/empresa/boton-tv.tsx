"use client";

// Botón «Mostrar en la TV» (como el de YouTube): abre el control remoto. La TV no se toca nunca.
import { useState } from "react";
import { ControlTv } from "./control-tv";

function IconoTv() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M3 8V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
      <path d="M3 12a8 8 0 0 1 8 8M3 16a4 4 0 0 1 4 4" />
      <circle cx="3.5" cy="19.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function BotonTv({ oscuro = true }: { oscuro?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        title="Mostrar en la TV"
        aria-label="Mostrar en la TV"
        className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm backdrop-blur-md sm:px-4 ${oscuro ? "bg-black/40 text-white hover:bg-black/55" : "border border-stone-300 bg-white text-stone-900 hover:bg-stone-50"}`}
      >
        <IconoTv />
        <span className={oscuro ? "hidden sm:inline" : ""}>Mostrar en la TV</span>
      </button>
      {abierto ? (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-black/50 sm:place-items-center sm:p-4" onClick={() => setAbierto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900">📺 Control de la TV</h2>
              <button onClick={() => setAbierto(false)} className="text-2xl text-stone-400" aria-label="Cerrar">×</button>
            </div>
            <ControlTv />
          </div>
        </div>
      ) : null}
    </>
  );
}
