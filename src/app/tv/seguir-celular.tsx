"use client";

// En la TV: cada 3 segundos mira si desde el celular se pidió otra pantalla y va sola.
import { useEffect, useRef } from "react";

type Comando = { vista: "oficina" | "armado" | "agente"; agente?: string; t: number };

export function SeguirCelular({ actual, onAgente }: { actual: "oficina" | "armado" | "inicio"; onAgente?: (id: string) => void }) {
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
      if (c.vista === "armado") {
        if (actual !== "armado") window.location.href = "/tv/armado";
      } else if (c.vista === "agente" && c.agente) {
        if (actual === "oficina" && cb.current) cb.current(c.agente);
        else window.location.href = `/tv/oficina?agente=${c.agente}`;
      } else if (actual !== "oficina") window.location.href = "/tv/oficina";
    };
    const t = setInterval(() => void mirar(), 3000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [actual]);
  return null;
}
