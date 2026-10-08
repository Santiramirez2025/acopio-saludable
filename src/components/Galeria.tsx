"use client";

import { useState } from "react";
import { Foto } from "./Foto";

/** Galería de la ficha: foto grande y miniaturas. Con una sola foto, solo la foto. */
export function Galeria({ fotos, alt, etiqueta }: { fotos: string[]; alt: string; etiqueta: string }) {
  const [activa, setActiva] = useState(0);
  const actual = fotos[activa] ?? fotos[0] ?? null;
  return (
    <div>
      <div className="rounded-3xl bg-white p-2.5 shadow-ficha">
        <Foto key={actual ?? "sin"} src={actual} alt={alt} etiqueta={etiqueta} className="aspect-square w-full rounded-2xl" prioridad />
      </div>
      {fotos.length > 1 && (
        <div className="riel mt-3 md:mx-0 md:px-0" role="tablist" aria-label="Fotos del producto">
          {fotos.map((f, i) => (
            <button key={f} type="button" role="tab" aria-selected={i === activa} aria-label={`Foto ${i + 1} de ${fotos.length}`} onClick={() => setActiva(i)}
              className={`w-20 shrink-0 snap-start rounded-xl bg-white p-1 ${i === activa ? "ring-2 ring-acopio-600" : "opacity-70"}`}>
              <Foto src={f} alt="" className="aspect-square w-full rounded-lg" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
