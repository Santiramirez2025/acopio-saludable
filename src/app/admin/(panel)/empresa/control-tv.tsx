"use client";

// El control remoto de la TV: todo se maneja desde el celular (o la compu) que tiene el panel abierto.
// La TV solo muestra. Cada toque manda un comando y la TV cambia sola en unos segundos.
import { useEffect, useRef, useState } from "react";
import { AGENTES } from "@/lib/agentes";

type Vista = "oficina" | "3d" | "armado" | "mensajes" | "agente";
type Presentacion = { start: () => Promise<unknown>; getAvailability?: () => Promise<{ value: boolean; onchange: (() => void) | null }> };

export const CLAVE_SEGUIR = "acopio-tv-sigue";

/** Le dice a la TV qué mostrar. Lo usa también la Ficha cuando «la TV sigue lo que abro». */
export async function mandarATv(vista: Vista, agente?: string): Promise<boolean> {
  const r = await fetch("/api/admin/tv/comando", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vista, agente }) }).catch(() => null);
  return !!r?.ok;
}

const PANTALLAS: { vista: Vista; icono: string; nombre: string; bajada: string }[] = [
  { vista: "oficina", icono: "👥", nombre: "Equipo", bajada: "Las 19 personas y lo que hizo cada una" },
  { vista: "armado", icono: "📦", nombre: "Pizarra de armado", bajada: "Qué lleva cada pedido" },
  { vista: "mensajes", icono: "💬", nombre: "Mensajes en vivo", bajada: "Todo lo que entra" },
  { vista: "3d", icono: "🧊", nombre: "Oficina 3D", bajada: "Solo si tu TV la aguanta" },
];

export function ControlTv() {
  const [aviso, setAviso] = useState("");
  const [actual, setActual] = useState<string>("");
  const [sigue, setSigue] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState("");
  const [hayCast, setHayCast] = useState(false);
  const pedido = useRef<Presentacion | null>(null);

  useEffect(() => {
    try {
      setSigue(localStorage.getItem(CLAVE_SEGUIR) === "1");
    } catch {
      /* nada */
    }
    const w = window as unknown as { PresentationRequest?: new (u: string[]) => Presentacion };
    if (!w.PresentationRequest) return;
    try {
      pedido.current = new w.PresentationRequest([`${window.location.origin}/tv`]);
      void pedido.current.getAvailability?.().then((a) => {
        setHayCast(a.value);
        a.onchange = () => setHayCast(a.value);
      }).catch(() => undefined);
    } catch {
      pedido.current = null;
    }
  }, []);

  const mostrar = async (vista: Vista, agente?: string, nombre?: string) => {
    setActual(agente ?? vista);
    setAviso("Mandando…");
    const ok = await mandarATv(vista, agente);
    setAviso(ok ? `✅ En la TV: ${nombre ?? vista}. Cambia en unos segundos.` : "No pude mandarlo. Probá de nuevo.");
  };

  const cambiarSigue = (v: boolean) => {
    setSigue(v);
    try {
      localStorage.setItem(CLAVE_SEGUIR, v ? "1" : "0");
    } catch {
      /* nada */
    }
  };

  const vincular = async () => {
    setEstado("Vinculando…");
    const r = await fetch("/api/admin/tv/vincular", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ codigo }) });
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    setEstado(r.ok ? "✅ Listo: la TV ya entra sola. Queda vinculada un año." : d.error ?? "No se pudo vincular.");
    if (r.ok) setCodigo("");
  };

  return (
    <div className="text-stone-900">
      <div className="grid grid-cols-2 gap-2">
        {PANTALLAS.map((p) => (
          <button
            key={p.vista}
            onClick={() => void mostrar(p.vista, undefined, p.nombre)}
            className={`rounded-2xl p-3 text-left transition active:scale-[.98] ${actual === p.vista ? "bg-acopio-700 text-white" : "bg-stone-100 hover:bg-stone-200"}`}
          >
            <div className="text-2xl">{p.icono}</div>
            <div className="mt-1 text-sm font-semibold">{p.nombre}</div>
            <div className={`text-xs ${actual === p.vista ? "text-white/75" : "text-stone-500"}`}>{p.bajada}</div>
          </button>
        ))}
      </div>

      <div className="mt-4 text-sm font-semibold">Mostrar a una persona del equipo</div>
      <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
        {AGENTES.map((x) => (
          <button
            key={x.id}
            onClick={() => void mostrar("agente", x.id, x.persona)}
            className={`flex flex-col items-center rounded-2xl p-1.5 text-xs transition active:scale-95 ${actual === x.id ? "bg-acopio-700 text-white" : "bg-stone-100 hover:bg-stone-200"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/avatars/${x.id}.svg`} alt="" className="h-10 w-10" />
            <span className="mt-0.5 font-medium">{x.persona}</span>
          </button>
        ))}
      </div>
      {aviso ? <p className="mt-3 text-sm text-stone-600">{aviso}</p> : null}

      <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-stone-100 p-3 text-sm">
        <span>
          <b>La TV sigue lo que abro</b>
          <span className="block text-xs text-stone-500">Cuando abrís a alguien acá para hablarle, la TV lo muestra.</span>
        </span>
        <input type="checkbox" checked={sigue} onChange={(e) => cambiarSigue(e.target.checked)} className="h-6 w-6 accent-acopio-700" />
      </label>

      <details className="mt-4 rounded-2xl border border-stone-200 p-3">
        <summary className="cursor-pointer text-sm font-semibold">Vincular una TV nueva (una sola vez)</summary>
        <ol className="mt-3 space-y-2 text-sm text-stone-700">
          <li>
            En el navegador de la TV abrí <b>acopiosaludable.com/tv</b> y guardala en favoritos. Después de vincularla, esa dirección entra directo, sin código.
          </li>
          {pedido.current ? (
            <li>
              Con Chromecast o Google TV en la misma wifi: <button onClick={() => void pedido.current?.start().catch(() => setEstado("No encontré ninguna TV con Chromecast en tu wifi."))} className="rounded-full bg-acopio-700 px-3 py-1 text-xs text-white">Buscar TVs{hayCast ? " (hay una)" : ""}</button>
            </li>
          ) : null}
          <li>Escribí acá el código de 6 números que aparece en la TV:</li>
        </ol>
        <div className="mt-3 flex gap-2">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="123456"
            className="min-w-0 flex-1 rounded-full border border-stone-300 px-4 py-2 text-center font-mono text-lg tracking-widest"
          />
          <button disabled={codigo.length !== 6} onClick={() => void vincular()} className="rounded-full bg-acopio-700 px-4 py-2 text-sm text-white disabled:opacity-40">Vincular</button>
        </div>
        {estado ? <p className="mt-2 text-sm text-stone-600">{estado}</p> : null}
      </details>
      <p className="mt-3 text-xs text-stone-400">Para hablar con los agentes usá el micrófono de este celular; la TV solo muestra.</p>
    </div>
  );
}
