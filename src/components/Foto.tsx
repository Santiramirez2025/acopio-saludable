"use client";

import { useState } from "react";

/** Foto de producto con respaldo: si no hay URL o falla la carga, muestra un bloque neutro con la categoría. */
export function Foto({ src, alt, etiqueta, className = "" }: { src: string | null; alt: string; etiqueta?: string; className?: string }) {
  const [rota, setRota] = useState(false);
  if (!src || rota) {
    return (
      <div className={`flex items-center justify-center bg-tierra-100 p-3 text-center text-xs font-medium uppercase tracking-wide text-tierra-700 ${className}`}>
        {etiqueta ?? "Sin foto"}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setRota(true)} className={`bg-white object-contain ${className}`} />;
}
