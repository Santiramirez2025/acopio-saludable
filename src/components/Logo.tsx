/**
 * Marca de Acopio Saludable. El isotipo es una "A" abierta que guarda una semilla:
 * la misma semilla amarilla que cierra la palabra "Acopio.".
 */
export function Isotipo({ className = "h-9 w-9", invertido = false }: { className?: string; invertido?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect width="100" height="100" rx="24" fill={invertido ? "#fff" : "#10251C"} />
      <path d="M26 76 L50 22 L74 76" fill="none" stroke={invertido ? "#10251C" : "#fff"} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="66" r="8.5" fill="#FFC83D" />
    </svg>
  );
}

export function Logo({ invertido = false, conBajada = false, className = "" }: { invertido?: boolean; conBajada?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Isotipo invertido={invertido} />
      <span className="flex flex-col">
        <span className="font-display text-[22px] font-extrabold leading-none tracking-tight">Acopio<span className="text-sol">.</span></span>
        {conBajada && <span className={`mt-0.5 text-[11px] font-medium leading-none ${invertido ? "text-acopio-100" : "text-acopio-600"}`}>saludable</span>}
      </span>
    </span>
  );
}
