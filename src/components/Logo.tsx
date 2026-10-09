/**
 * Marca de Acopio Saludable. El isotipo son dos granos que se apoyan y forman una "A", con una semilla
 * en el medio: la misma semilla amarilla que cierra la palabra "Acopio.".
 */
const GRANO = "M0,-34 C17,-17 17,15 0,34 C-17,15 -17,-17 0,-34Z";

export function Isotipo({ className = "h-9 w-9", invertido = false }: { className?: string; invertido?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="50" fill={invertido ? "#F6EFDC" : "#10251C"} />
      <g transform="translate(50 50) scale(.78) translate(-50 -50)">
        <g fill={invertido ? "#10251C" : "#fff"}>
          <path transform="translate(36 50) rotate(23)" d={GRANO} />
          <path transform="translate(64 50) rotate(-23)" d={GRANO} />
        </g>
        <circle cx="50" cy="68" r="8" fill="#FFC83D" />
      </g>
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
