"use client";

import { useState } from "react";
import { Foto } from "./Foto";

/** Galería de la ficha: foto grande y miniaturas. Con una sola foto, solo la foto. */
export function Galeria({ fotos, alt, etiqueta }: { fotos: string[]; alt: string; etiqueta: string }) {
  const [activa, setActiva] = useState(0);
  const [mudo, setMudo] = useState(true);
  const actual = fotos[activa] ?? fotos[0] ?? null;
  return (
    <div>
      {/* En celular la foto va más chica: así el precio, «Agregar al pedido» y «Pedir por WhatsApp» entran en la primera pantalla (390×844). */}
      <div className="rounded-3xl bg-white p-2.5 shadow-ficha max-md:mx-auto max-md:max-w-[13rem]">
        <div className="relative">
          {actual?.endsWith(".mp4") ? (
            <>
              <video key={actual} src={actual} poster={actual.replace(/\.mp4$/, ".jpg")} className="aspect-square w-full rounded-2xl object-cover" autoPlay muted={mudo} loop playsInline aria-label={`Video de ${alt}`} />
              <button type="button" onClick={() => setMudo((m) => !m)} className="absolute bottom-2 right-2 rounded-full bg-acopio-900/85 px-3 py-1.5 text-xs font-semibold text-white">
                {mudo ? "🔈 Activar sonido" : "🔊 Silenciar"}
              </button>
            </>
          ) : (
            <Foto key={actual ?? "sin"} src={actual} alt={alt} etiqueta={etiqueta} className="aspect-square w-full rounded-2xl" prioridad sizes="(max-width: 768px) 208px, 560px" />
          )}
          {actual?.startsWith("/img/reales/") && <span className="absolute bottom-2 left-2 rounded-full bg-acopio-900/85 px-2.5 py-1 text-[11px] font-semibold text-white">📷 Foto real · así te llega</span>}
        </div>
      </div>
      {fotos.length > 1 && (
        <div className="riel mt-3 max-md:justify-center md:mx-0 md:px-0" role="tablist" aria-label="Fotos del producto">
          {fotos.map((f, i) => (
            <button key={f} type="button" role="tab" aria-selected={i === activa} aria-label={f.endsWith(".mp4") ? "Video del producto" : f.startsWith("/img/reales/") ? "Foto real del producto" : `Foto ${i + 1} de ${fotos.length}`} onClick={() => setActiva(i)}
              className={`w-20 shrink-0 snap-start rounded-xl bg-white p-1 ${i === activa ? "ring-2 ring-acopio-600" : "opacity-70"}`}>
              <span className="relative block">
                <Foto src={f.endsWith(".mp4") ? f.replace(/\.mp4$/, ".jpg") : f} alt="" className="aspect-square w-full rounded-lg" sizes="96px" />
                {f.endsWith(".mp4") && <span className="absolute inset-0 grid place-items-center text-xl text-white drop-shadow">▶</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
