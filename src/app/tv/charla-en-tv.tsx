"use client";

// En la TV: cuando Santiago habla con alguien del equipo desde el celular, aparece en grande
// la persona y lo que se dicen (como subtítulos). El audio sale del celular.
import { useEffect, useRef, useState } from "react";
import { AGENTES } from "@/lib/agentes";

type Charla = { agente: string | null; estado: string; mensajes: { rol: "user" | "assistant"; texto: string }[]; t: number };

const ESTADO: Record<string, string> = { hablando: "está hablando", escuchando: "te escucha", pensando: "está pensando", conectando: "conectando…", escribiendo: "charla escrita" };

export function CharlaEnTv() {
  const [c, setC] = useState<Charla | null>(null);
  const ultimoT = useRef(0);
  const visto = useRef(0);
  useEffect(() => {
    let vivo = true;
    const mirar = async () => {
      const d = (await fetch("/api/tv/charla", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)) as { charla?: Charla | null } | null;
      if (!vivo) return;
      const ch = d?.charla ?? null;
      if (ch && ch.t !== ultimoT.current) {
        ultimoT.current = ch.t;
        visto.current = Date.now();
        setC(ch.agente ? ch : null);
      } else if (c && Date.now() - visto.current > 120_000) setC(null); // dos minutos sin novedades: se cierra sola
    };
    void mirar();
    const t = setInterval(() => void mirar(), 1200);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [c]);

  if (!c?.agente) return null;
  const a = AGENTES.find((x) => x.id === c.agente);
  if (!a) return null;
  const hablando = c.estado === "hablando";
  const ultimos = c.mensajes.slice(-4);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "#0b2a20", color: "#fff", display: "flex", fontFamily: "Figtree, system-ui, sans-serif" }}>
      <style>{"@keyframes acopioLatido{0%{box-shadow:0 0 0 0 rgba(255,200,61,.7)}100%{box-shadow:0 0 0 40px rgba(255,200,61,0)}}"}</style>
      <div style={{ width: "36%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4vh 2vw" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/avatars/${a.id}.svg`}
          alt=""
          style={{ width: "22vw", height: "22vw", borderRadius: "50%", background: "rgba(255,255,255,.92)", animation: hablando ? "acopioLatido 1s ease-out infinite" : "none" }}
        />
        <div style={{ fontSize: "5vw", fontWeight: 900, marginTop: "3vh" }}>{a.persona}</div>
        <div style={{ fontSize: "1.8vw", color: "rgba(255,255,255,.7)" }}>{a.nombre}</div>
        <div style={{ marginTop: "2vh", fontSize: "1.6vw", fontWeight: 700, color: "#FFC83D" }}>{ESTADO[c.estado] ?? "en charla con Santiago"}</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "2vh", padding: "6vh 4vw 6vh 0", overflow: "hidden" }}>
        {ultimos.length === 0 ? <div style={{ fontSize: "2.4vw", color: "rgba(255,255,255,.6)" }}>Hablale desde el celular…</div> : null}
        {ultimos.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.rol === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              background: m.rol === "user" ? "rgba(255,255,255,.12)" : "#fff",
              color: m.rol === "user" ? "#fff" : "#0b2a20",
              borderRadius: 28,
              padding: "1.6vh 1.8vw",
              fontSize: i === ultimos.length - 1 ? "2.4vw" : "1.7vw",
              lineHeight: 1.3,
              opacity: i === ultimos.length - 1 ? 1 : 0.75,
            }}
          >
            <div style={{ fontSize: "1.1vw", fontWeight: 700, opacity: 0.6, marginBottom: 4 }}>{m.rol === "user" ? "Santiago" : a.persona}</div>
            {m.texto.length > 420 ? `${m.texto.slice(0, 419)}…` : m.texto}
          </div>
        ))}
      </div>
    </div>
  );
}
