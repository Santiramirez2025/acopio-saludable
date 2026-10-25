"use client";

// La empresa en la TV, sin 3D: un mural liviano que anda en cualquier Smart TV (las TVs no se bancan
// la oficina 3D y quedaba en blanco). Se diseña a 1920×1080 y se escala a la pantalla que tenga la TV.
// Muestra los números del día, las 19 personas con su estado y lo último que hizo cada una, rotando.
// Se maneja desde el celular (panel → «Mostrar en la TV»); el control remoto no hace falta.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AgenteVista, DatosOficina } from "@/app/admin/(panel)/empresa/oficina";
import { SeguirCelular } from "./seguir-celular";

const COLOR: Record<AgenteVista["estado"], string> = { ok: "#22c55e", falla: "#ef4444", atrasado: "#f59e0b", pendiente: "#38bdf8", descanso: "#9ca3af" };
const ANCHO = 1920;
const ALTO = 1080;

function linea(t: string, largo: number): string {
  const l = t.split("\n").map((x) => x.replace(/^[#*\-•>\s]+/, "").replace(/\*\*/g, "").trim()).find((x) => x.length > 12) ?? "";
  return l.length > largo ? `${l.slice(0, largo - 1)}…` : l;
}

export function MuralTv({ datos }: { datos: DatosOficina }) {
  const router = useRouter();
  const [escala, setEscala] = useState(1);
  const [izq, setIzq] = useState(0);
  const [i, setI] = useState(0);
  const [fijo, setFijo] = useState<{ id: string; hasta: number } | null>(null);
  const [hora, setHora] = useState(datos.hora);

  // Que entre justo en la pantalla, sea 720p, 1080p o 4K.
  useEffect(() => {
    const medir = () => {
      const e = Math.min(window.innerWidth / ANCHO, window.innerHeight / ALTO);
      setEscala(e);
      setIzq((window.innerWidth - ANCHO * e) / 2);
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  // Datos nuevos cada minuto; reloj cada 20 s.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 60_000);
    const r = setInterval(() => setHora(new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Cordoba" })), 20_000);
    return () => {
      clearInterval(t);
      clearInterval(r);
    };
  }, [router]);

  const conTrabajo = useMemo(() => datos.agentes.filter((a) => a.informes.length), [datos.agentes]);
  useEffect(() => {
    const t = setInterval(() => setI((x) => x + 1), 9_000);
    return () => clearInterval(t);
  }, []);
  const ahora = Date.now();
  const destacado = (fijo && fijo.hasta > ahora ? datos.agentes.find((a) => a.id === fijo.id) : null) ?? (conTrabajo.length ? conTrabajo[i % conTrabajo.length] : datos.agentes[0]);

  const trabajan = datos.agentes.filter((a) => a.estado !== "descanso");
  const cumplieron = trabajan.filter((a) => a.estado === "ok").length;
  const atencion = datos.agentes.filter((a) => a.estado === "falla" || a.estado === "atrasado");

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0b2a20", overflow: "hidden" }}>
      <SeguirCelular actual="oficina" onAgente={(id) => setFijo({ id, hasta: Date.now() + 60_000 })} />
      <div
        style={{ width: ANCHO, height: ALTO, transform: `scale(${escala})`, transformOrigin: "0 0", position: "absolute", left: izq, top: 0, color: "#fff", fontFamily: "Figtree, system-ui, sans-serif" }}
      >
        {/* Encabezado */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "44px 64px 0" }}>
          <div>
            <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1 }}>Acopio.</div>
            <div style={{ fontSize: 26, color: "rgba(255,255,255,.7)", marginTop: 8 }}>
              19 personas trabajando para vos · {trabajan.length ? `${cumplieron} de ${trabajan.length} ya trabajaron hoy` : "hoy el equipo descansa"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, color: "#FFC83D" }}>{hora}</div>
            <div style={{ fontSize: 24, color: "rgba(255,255,255,.7)", marginTop: 6 }}>{datos.hoy} · {datos.temporada}</div>
          </div>
        </div>

        {/* Números */}
        <div style={{ display: "flex", gap: 20, padding: "32px 64px 0" }}>
          {datos.kpis.slice(0, 6).map((k) => (
            <div key={k.titulo} style={{ flex: 1, background: "rgba(255,255,255,.07)", borderRadius: 24, padding: "20px 26px" }}>
              <div style={{ fontSize: 48, fontWeight: 800 }}>{k.valor}</div>
              <div style={{ fontSize: 20, color: "rgba(255,255,255,.65)" }}>{k.titulo}</div>
            </div>
          ))}
        </div>

        {/* Equipo */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, padding: "28px 64px 0" }}>
          {datos.agentes.map((a) => {
            const on = a.id === destacado?.id;
            return (
              <div
                key={a.id}
                style={{ width: 340, display: "flex", alignItems: "center", gap: 14, borderRadius: 20, padding: "10px 14px", background: on ? "#FFC83D" : "rgba(255,255,255,.06)", color: on ? "#0b2a20" : "#fff", transition: "background .4s" }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/avatars/${a.id}.svg`} alt="" width={64} height={64} style={{ borderRadius: 999, background: "rgba(255,255,255,.9)" }} />
                  <span style={{ position: "absolute", right: 0, bottom: 0, width: 18, height: 18, borderRadius: 999, background: COLOR[a.estado], border: `3px solid ${on ? "#FFC83D" : "#0b2a20"}` }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, whiteSpace: "nowrap" }}>{a.persona} {a.emoji}</div>
                  <div style={{ fontSize: 17, opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 230 }}>{a.nombre}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Lo último que hizo alguien + atención */}
        <div style={{ position: "absolute", left: 64, right: 64, bottom: 44, display: "flex", gap: 20 }}>
          {destacado ? (
            <div style={{ flex: 3, display: "flex", gap: 28, alignItems: "center", background: "#fff", color: "#0b2a20", borderRadius: 32, padding: "28px 36px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/avatars/${destacado.id}.svg`} alt="" width={140} height={140} style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 22, color: "#0F6B4F", fontWeight: 700 }}>
                  AHORA · {destacado.nombre.toUpperCase()} {destacado.informes[0] ? `· ${destacado.informes[0].cuando}` : ""}
                </div>
                <div style={{ fontSize: 44, fontWeight: 900, marginTop: 2 }}>{destacado.persona} {destacado.emoji}</div>
                <div style={{ fontSize: 28, lineHeight: 1.3, marginTop: 8, maxHeight: 110, overflow: "hidden" }}>
                  {destacado.informes[0] ? linea(destacado.informes[0].texto, 200) : destacado.mision}
                </div>
              </div>
            </div>
          ) : null}
          <div style={{ flex: 1, background: "rgba(255,255,255,.07)", borderRadius: 32, padding: "28px 30px" }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>Necesita atención</div>
            {atencion.length ? (
              atencion.slice(0, 4).map((a) => (
                <div key={a.id} style={{ fontSize: 22, marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 999, background: COLOR[a.estado], flexShrink: 0 }} />
                  {a.persona}: {a.estadoTexto}
                </div>
              ))
            ) : (
              <div style={{ fontSize: 26, marginTop: 12, color: "rgba(255,255,255,.8)" }}>Todo en orden ✅</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
