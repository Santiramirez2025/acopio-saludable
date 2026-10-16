"use client";

import { useEffect, useRef, useState } from "react";

/** El botón «Cargar en Distrimay» para arrastrar a la barra de favoritos. */
export function MarcadorCompras({ codigo }: { codigo: string }) {
  const enlace = useRef<HTMLAnchorElement>(null);
  const [copiado, setCopiado] = useState(false);
  // React no deja poner "javascript:" en un href: se asigna a mano para poder arrastrarlo.
  useEffect(() => {
    enlace.current?.setAttribute("href", codigo);
  }, [codigo]);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a ref={enlace} onClick={(e) => e.preventDefault()} className="inline-block cursor-grab rounded-md bg-acopio-700 px-3 py-2 font-medium text-white">🛒 Cargar en Distrimay</a>
      <button type="button" className="btn-sec" onClick={async () => { await navigator.clipboard.writeText(codigo); setCopiado(true); }}>{copiado ? "Copiado ✓" : "Copiar el código"}</button>
    </span>
  );
}
