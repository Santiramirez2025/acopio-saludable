"use client";

// En la TV: cuando Santiago habla con alguien del equipo desde el celular, aparece en grande
// la persona y lo que se dicen (como subtítulos). El audio sale del celular.
import { useEffect, useRef, useState } from "react";
import { AGENTES } from "@/lib/agentes";

type Charla = { agente: string | null; estado: string; mensajes: { rol: "user" | "assistant"; texto: string }[]; t: number };

const ESTADO: Record<string, string> = { hablando: "está hablando", escuchando: "te escucha", pensando: "está pensando", conectando: "conectando…", escribiendo: "charla escrita" };

const CSS = `
@keyframes acLatido{0%{box-shadow:0 0 0 0 rgba(255,200,61,.65)}100%{box-shadow:0 0 0 3.2vw rgba(255,200,61,0)}}
@keyframes acRespira{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}
@keyframes acBarra{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}
@keyframes acPunto{0%,80%,100%{opacity:.2}40%{opacity:1}}
@keyframes acEntra{from{opacity:0;transform:translateY(2vh)}to{opacity:1;transform:none}}
@keyframes acFondo{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
`;

function Ondas({ activo }: { activo: boolean }) {
  const alturas = [0.5, 0.8, 1, 0.7, 0.9, 0.6, 1, 0.75, 0.55];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5vw", height: "6vh", marginTop: "2.5vh" }}>
      {alturas.map((h, i) => (
        <span
          key={i}
          style={{
            width: "0.55vw",
            height: `${h * 6}vh`,
            borderRadius: 99,
            background: "#FFC83D",
            transformOrigin: "center",
            transform: activo ? undefined : "scaleY(.15)",
            animation: activo ? `acBarra ${0.55 + (i % 4) * 0.12}s ease-in-out ${i * 0.07}s infinite` : "none",
            opacity: activo ? 1 : 0.35,
            transition: "opacity .3s",
          }}
        />
      ))}
    </div>
  );
}

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
    const t = setInterval(() => void mirar(), 1000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [c]);

  if (!c?.agente) return null;
  const a = AGENTES.find((x) => x.id === c.agente);
  if (!a) return null;
  const hablando = c.estado === "hablando";
  const pensando = c.estado === "pensando" || c.estado === "conectando";
  const ultimos = c.mensajes.slice(-3);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        color: "#fff",
        display: "flex",
        fontFamily: "Figtree, system-ui, sans-serif",
        background: "linear-gradient(120deg,#062018,#0b2a20,#0f3d2c,#0b2a20)",
        backgroundSize: "300% 300%",
        animation: "acFondo 18s ease infinite",
      }}
    >
      <style>{CSS}</style>
      <div style={{ width: "38%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4vh 2vw" }}>
        <div style={{ borderRadius: "50%", padding: "0.6vw", background: hablando ? "#FFC83D" : "rgba(255,255,255,.18)", transition: "background .3s", animation: hablando ? "acLatido 1.1s ease-out infinite" : "acRespira 4s ease-in-out infinite" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/avatars/${a.id}.svg`} alt="" style={{ display: "block", width: "21vw", height: "21vw", borderRadius: "50%", background: "rgba(255,255,255,.95)" }} />
        </div>
        <div style={{ fontSize: "5vw", fontWeight: 900, marginTop: "3vh", lineHeight: 1 }}>{a.persona}</div>
        <div style={{ fontSize: "1.8vw", color: "rgba(255,255,255,.7)", marginTop: "1vh" }}>{a.nombre}</div>
        <Ondas activo={hablando} />
        <div style={{ marginTop: "1.5vh", fontSize: "1.6vw", fontWeight: 700, color: "#FFC83D" }}>
          {ESTADO[c.estado] ?? "en charla con Santiago"}
          {pensando ? (
            <span>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ animation: `acPunto 1.2s ${i * 0.2}s infinite` }}>.</span>
              ))}
            </span>
          ) : null}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "2.2vh", padding: "7vh 5vw 8vh 0", overflow: "hidden" }}>
        {ultimos.length === 0 ? <div style={{ fontSize: "2.4vw", color: "rgba(255,255,255,.6)" }}>Hablale desde el celular…</div> : null}
        {ultimos.map((m, i) => {
          const ultimo = i === ultimos.length - 1;
          return (
            <div
              key={`${i}-${m.rol}-${m.texto.slice(0, 12)}`}
              style={{
                alignSelf: m.rol === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%",
                background: m.rol === "user" ? "rgba(255,255,255,.12)" : "#fff",
                color: m.rol === "user" ? "#fff" : "#0b2a20",
                borderRadius: "2vw",
                padding: "2vh 2vw",
                fontSize: ultimo ? "2.5vw" : "1.6vw",
                fontWeight: ultimo ? 600 : 400,
                lineHeight: 1.3,
                opacity: ultimo ? 1 : 0.6,
                boxShadow: m.rol === "assistant" && ultimo ? "0 2vh 6vh rgba(0,0,0,.35)" : "none",
                animation: "acEntra .45s ease-out",
                transition: "font-size .3s, opacity .3s",
              }}
            >
              <div style={{ fontSize: "1.05vw", fontWeight: 800, opacity: 0.55, marginBottom: "0.6vh", letterSpacing: ".05em" }}>{m.rol === "user" ? "SANTIAGO" : a.persona.toUpperCase()}</div>
              {m.texto.length > 380 ? `${m.texto.slice(0, 379)}…` : m.texto}
            </div>
          );
        })}
      </div>
    </div>
  );
}
