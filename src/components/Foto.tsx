"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Foto de producto sobre una ficha menta. Las fotos con fondo blanco se funden con la ficha
 * (mix-blend-multiply), así el catálogo se ve parejo aunque las fotos vengan de orígenes distintos.
 * Pasa por el optimizador de imágenes: se sirve en el tamaño justo y en formato liviano.
 * Sin foto o si falla la carga: una ilustración de la casa con el nombre de la categoría.
 */
export function Foto({ src, alt, etiqueta, className = "", prioridad = false, sizes = "(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 280px" }: { src: string | null; alt: string; etiqueta?: string; className?: string; prioridad?: boolean; sizes?: string }) {
  const [rota, setRota] = useState(false);
  if (!src || rota) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-acopio-100 p-3 text-center text-acopio-700 ${className}`} role="img" aria-label={alt || etiqueta || "Producto sin foto"}>
        <svg viewBox="0 0 64 64" className="h-2/5 max-h-20 w-auto" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14c4 3 20 3 24 0M22 14c-8 10-10 22-8 34 1 5 5 6 18 6s17-1 18-6c2-12 0-24-8-34" />
          <path d="M27 34c3-6 7-6 10 0M32 30v14" />
        </svg>
        {etiqueta?.trim() && <span className="text-[11px] font-semibold leading-tight">{etiqueta}</span>}
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-acopio-50 ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={prioridad} quality={72} onError={() => setRota(true)} className="object-contain mix-blend-multiply" />
    </div>
  );
}
