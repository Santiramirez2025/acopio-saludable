"use client";

import { useEffect, useState } from "react";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/**
 * Cuenta regresiva al próximo corte de compra. El corte es real (lo define el panel):
 * si cierra hoy, muestra horas y minutos; si no, el día en que cierra.
 */
export function CuentaRegresiva({ corte, className = "" }: { corte: string | null; className?: string }) {
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => {
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!corte || ahora === null) return null;
  const fin = new Date(corte).getTime();
  const resta = fin - ahora;
  if (resta <= 0) return null;
  const horas = Math.floor(resta / 3_600_000);
  const minutos = Math.floor((resta % 3_600_000) / 60_000);
  const local = new Date(fin - 3 * 3_600_000);
  const hoy = new Date(ahora - 3 * 3_600_000);
  const dias = Math.round((Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())) / 86_400_000);
  const hora = `${local.getUTCHours()}${local.getUTCMinutes() ? `:${String(local.getUTCMinutes()).padStart(2, "0")}` : ""} h`;
  return (
    <p className={`flex items-start gap-2 rounded-xl bg-sol-claro/60 px-3.5 py-2.5 text-sm text-acopio-900 ${className}`} role="timer" aria-live="off">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>
      {dias === 0 ? (
        <span>Pedí en <b className="tabular-nums">{horas > 0 ? `${horas} h ` : ""}{minutos} min</b> y entra en la compra de hoy.</span>
      ) : (
        <span>Pedí antes {dias === 1 ? "de mañana" : `del ${DIAS[local.getUTCDay()]}`} a las <b>{hora}</b> y entra en la próxima compra.</span>
      )}
    </p>
  );
}
