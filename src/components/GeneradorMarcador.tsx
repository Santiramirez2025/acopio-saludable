"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { generarMarcador, type EstadoMarcador } from "@/lib/acciones";

export function GeneradorMarcador({ hayToken }: { hayToken: boolean }) {
  const [estado, accion, generando] = useActionState<EstadoMarcador, FormData>(generarMarcador, null);
  const enlace = useRef<HTMLAnchorElement>(null);
  const [copiado, setCopiado] = useState(false);
  const marcador = estado && "marcador" in estado ? estado.marcador : null;

  // React no deja poner "javascript:" en un href: se asigna a mano para poder arrastrar el enlace a la barra de marcadores.
  useEffect(() => {
    if (marcador && enlace.current) enlace.current.setAttribute("href", marcador);
  }, [marcador]);

  return (
    <div className="space-y-3">
      <form action={accion}>
        <button className="btn" disabled={generando}>{generando ? "Generando…" : hayToken ? "Generar un marcador nuevo" : "Generar el marcador"}</button>
        {hayToken && !marcador && <p className="mt-1 text-xs text-stone-500">Ya hay un marcador activo. Si generás otro, el anterior deja de funcionar.</p>}
      </form>
      {estado && "error" in estado && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{estado.error}</p>}
      {marcador && (
        <div className="space-y-2 rounded-lg border border-acopio-500 bg-acopio-50 p-3 text-sm">
          <p><b>Arrastrá este botón a tu barra de marcadores</b> (se muestra una sola vez):</p>
          <a ref={enlace} onClick={(e) => e.preventDefault()} className="inline-block cursor-grab rounded-md bg-acopio-700 px-3 py-2 font-medium text-white">Sincronizar precios Acopio</a>
          <p className="text-stone-600">¿No ves la barra de marcadores? Creá un marcador cualquiera y pegá esto como dirección:</p>
          <button type="button" className="btn-sec" onClick={async () => { await navigator.clipboard.writeText(marcador); setCopiado(true); }}>{copiado ? "Copiado ✓" : "Copiar el código del marcador"}</button>
        </div>
      )}
    </div>
  );
}
