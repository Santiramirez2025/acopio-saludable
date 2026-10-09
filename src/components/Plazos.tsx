/** Tiempos de entrega, siempre con el mismo texto en toda la tienda. */
export function Plazos({ propia, plazoPropia, className = "" }: { propia: boolean; plazoPropia: string; className?: string }) {
  return (
    <ul className={`space-y-1 text-sm ${className}`}>
      {propia && (
        <li className="flex gap-2">
          <Icono d="M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z" />
          <span><b>Villa Carlos Paz y sur de Punilla</b> (San Antonio de Arredondo, Mayu Sumaj, Icho Cruz y Cuesta Blanca): te lo llevamos en {plazoPropia}, sin cargo.</span>
        </li>
      )}
      <li className="flex gap-2">
        <Icono d="M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8" />
        <span><b>{propia ? "Resto del país" : "Todo el país"}:</b> despacho en 24 a 48 hs hábiles y de 2 a 7 días hábiles de correo según la zona.</span>
      </li>
    </ul>
  );
}

function Icono({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-acopio-600" aria-hidden="true"><path d={d} /></svg>;
}
