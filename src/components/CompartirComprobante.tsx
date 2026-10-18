"use client";

import { useState } from "react";

/** Compartir o copiar el link del comprobante: se guarda en el celular sin imprimir nada. */
export function CompartirComprobante({ numero }: { numero: string }) {
  const [copiado, setCopiado] = useState(false);
  async function compartir() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Comprobante ${numero} · Acopio Saludable`, url });
        return;
      }
    } catch {
      // cancelado: probamos copiar
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <button type="button" onClick={compartir} className="btn w-full">
      {copiado ? "Link copiado" : "Guardar o compartir comprobante"}
    </button>
  );
}
