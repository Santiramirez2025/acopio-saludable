"use client";

// En la TV: cada 3 segundos mira si desde el celular se pidió otra pantalla y va sola.
// La TV no se toca: todos los mandos están en el celular (panel → 📺 TV).
import { useEffect, useRef } from "react";

type Vista = "oficina" | "3d" | "armado" | "mensajes" | "agente";
type Comando = { vista: Vista; agente?: string; t: number };

const RUTA: Record<Exclude<Vista, "agente">, string> = { oficina: "/tv/oficina", "3d": "/tv/oficina?3d=1", armado: "/tv/armado", mensajes: "/tv/mensajes" };

export function SeguirCelular({ actual, onAgente }: { actual: "oficina" | "3d" | "armado" | "mensajes" | "inicio"; onAgente?: (id: string) => void }) {
  const visto = useRef<number>(Date.now());
  const cb = useRef(onAgente);
  cb.current = onAgente;
  useEffect(() => {
    let vivo = true;
    const mirar = async () => {
      const d = (await fetch("/api/tv/comando", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)) as { comando?: Comando | null } | null;
      const c = d?.comando;
      if (!vivo || !c || c.t <= visto.current) return;
      visto.current = c.t;
      if (c.vista === "agente" && c.agente) {
        // En el mural o en la 3D se muestra esa persona; desde otra pantalla vuelve al mural con ella.
        if ((actual === "oficina" || actual === "3d") && cb.current) cb.current(c.agente);
        else window.location.href = `/tv/oficina?agente=${c.agente}`;
      } else if (c.vista !== "agente" && c.vista !== actual) window.location.href = RUTA[c.vista] ?? "/tv/oficina";
    };
    const t = setInterval(() => void mirar(), 3000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [actual]);
  return null;
}
