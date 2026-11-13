"use client";

import { useEffect, useState } from "react";
import { HORA_LIMITE_PAGO, HORA_REPARTO, avisoReparto, textoResta } from "@/lib/salida-reparto";

/**
 * Cuándo sale el pedido en Carlos Paz y la zona, con la regla real del reparto (pagado antes de las 15,
 * sale hoy a las 16; domingos no hay reparto). Reemplaza al corte de compra al proveedor, que es interno.
 * Se calcula en el navegador para no fijar la hora en el HTML cacheado.
 */
export function AvisoRepartoHoy({ className = "" }: { className?: string }) {
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => {
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (ahora === null) return null;
  const a = avisoReparto(ahora);
  return (
    <p className={`flex items-start gap-2 rounded-xl bg-sol-claro/60 px-3.5 py-2.5 text-sm text-acopio-900 ${className}`} role="timer" aria-live="off">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>
      {a.restaMs !== null ? (
        <span>
          <b>En Carlos Paz y la zona:</b> si lo pagás en los próximos <b className="tabular-nums">{textoResta(a.restaMs)}</b> (antes de las {HORA_LIMITE_PAGO} h), sale <b>hoy</b> en el reparto de las {HORA_REPARTO}.
        </span>
      ) : (
        <span>
          <b>En Carlos Paz y la zona:</b> si lo pagás antes de las {HORA_LIMITE_PAGO} h, sale <b>{a.dia}</b> en el reparto de las {HORA_REPARTO}.
        </span>
      )}
    </p>
  );
}
