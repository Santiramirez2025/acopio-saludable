"use client";

// Pantalla para la TV: muestra un código; Santiago lo carga en el panel (📺 → «Vincular una TV») y la TV
// entra sola a la oficina 3D. Sirve para cualquier Smart TV con navegador.
import { useEffect, useState } from "react";

export function TvVincular() {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    let t: ReturnType<typeof setTimeout>;
    const nuevo = async () => {
      setError("");
      const r = await fetch("/api/tv/codigo", { method: "POST" }).catch(() => null);
      const d = (await r?.json().catch(() => null)) as { codigo?: string; secreto?: string; error?: string } | null;
      if (!vivo) return;
      if (!d?.codigo || !d.secreto) {
        setError(d?.error ?? "Sin conexión. Reintentando…");
        t = setTimeout(nuevo, 5000);
        return;
      }
      setCodigo(d.codigo);
      const inicio = Date.now();
      const mirar = async () => {
        if (!vivo) return;
        if (Date.now() - inicio > 9 * 60_000) return void nuevo();
        const e = await fetch(`/api/tv/estado?codigo=${d.codigo}&secreto=${encodeURIComponent(d.secreto!)}`).then((x) => x.json()).catch(() => ({ estado: "esperando" }));
        if (e.estado === "listo") return void window.location.replace("/tv/oficina");
        if (e.estado === "vencido") return void nuevo();
        t = setTimeout(mirar, 2500);
      };
      void mirar();
    };
    void nuevo();
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#0b2a20] p-8 text-white">
      <div className="text-center">
        <div className="text-5xl font-black">Acopio.</div>
        <p className="mt-6 text-2xl text-white/80">Para ver la empresa en esta TV, en el panel tocá 📺 y después «Vincular una TV». Ingresá este código:</p>
        <div className="mt-8 font-mono text-8xl font-bold tracking-[0.3em] text-amber-400">{codigo ? `${codigo.slice(0, 3)} ${codigo.slice(3)}` : "· · ·"}</div>
        <p className="mt-8 text-lg text-white/50">{error || "El código cambia cada 10 minutos. La TV queda vinculada un año."}</p>
      </div>
    </main>
  );
}
