"use client";

import { useState } from "react";
import { Foto } from "./Foto";

/** Galería de la ficha: foto grande y miniaturas. Con una sola foto, solo la foto. */
export function Galeria({ fotos, alt, etiqueta }: { fotos: string[]; alt: string; etiqueta: string }) {
  const [activa, setActiva] = useState(0);
  const actual = fotos[activa] ?? fotos[0] ?? null;
  return (
    <div>
      {/* En celular la foto va más chica: así el precio y «Agregar al pedido» entran en la primera pantalla. */}
      <div className="rounded-3xl bg-white p-2.5 shadow-ficha max-md:mx-auto max-md:max-w-[16rem]">
        <Foto key={actual ?? "sin"} src={actual} alt={alt} etiqueta={etiqueta} className="aspect-square w-full rounded-2xl" prioridad sizes="(max-width: 768px) 256px, 560px" />
      </div>
      {fotos.length > 1 && (
        <div className="riel mt-3 md:mx-0 md:px-0" role="tablist" aria-label="Fotos del producto">
          {fotos.map((f, i) => (
            <button key={f} type="button" role="tab" aria-selected={i === activa} aria-label={`Foto ${i + 1} de ${fotos.length}`} onClick={() => setActiva(i)}
              className={`w-20 shrink-0 snap-start rounded-xl bg-white p-1 ${i === activa ? "ring-2 ring-acopio-600" : "opacity-70"}`}>
              <Foto src={f} alt="" className="aspect-square w-full rounded-lg" sizes="96px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
