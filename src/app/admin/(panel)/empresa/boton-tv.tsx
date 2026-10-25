"use client";

// Botón «transmitir» como el de YouTube: si hay un Chromecast / Google TV en la red, lo abre en un toque.
// En la TV aparece un código; acá se carga y la TV entra sola a la oficina (queda vinculada 30 días).
// Para TVs sin Chromecast: abrir acopiosaludable.com/tv en el navegador de la TV y cargar el código igual.
import { useEffect, useRef, useState } from "react";

type Presentacion = { start: () => Promise<unknown>; getAvailability?: () => Promise<{ value: boolean; onchange: (() => void) | null }> };

function IconoTv({ activo }: { activo: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M3 8V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
      <path d="M3 12a8 8 0 0 1 8 8M3 16a4 4 0 0 1 4 4" />
      <circle cx="3.5" cy="19.5" r="0.6" fill="currentColor" />
      {activo ? <path d="M14 9h4v7h-4" strokeWidth="1.5" /> : null}
    </svg>
  );
}

export function BotonTv({ oscuro = true }: { oscuro?: boolean }) {
  const [hayCast, setHayCast] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState("");
  const pedido = useRef<Presentacion | null>(null);

  useEffect(() => {
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

  const transmitir = async () => {
    setAbierto(true);
    setEstado("");
    if (!pedido.current) return;
    try {
      await pedido.current.start();
      setEstado("Listo: en la TV aparece un código. Escribilo acá abajo.");
    } catch (e) {
      const n = (e as { name?: string })?.name;
      if (n === "NotFoundError") setEstado("No encontré ningún Chromecast o Google TV en tu wifi. Usá la opción de abajo.");
    }
  };

  const vincular = async () => {
    setEstado("Vinculando…");
    const r = await fetch("/api/admin/tv/vincular", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ codigo }) });
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    setEstado(r.ok ? "✅ Listo: la TV ya entra a la oficina. Queda vinculada 30 días." : d.error ?? "No se pudo vincular.");
    if (r.ok) setCodigo("");
  };

  return (
    <>
      <button
        onClick={() => void transmitir()}
        title="Transmitir a la TV"
        aria-label="Transmitir a la TV"
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm backdrop-blur-md ${oscuro ? "bg-black/40 text-white hover:bg-black/55" : "border border-stone-300 bg-white text-stone-900 hover:bg-stone-50"}`}
      >
        <IconoTv activo={hayCast} />
        <span>TV</span>
      </button>
      {abierto ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" onClick={() => setAbierto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 text-stone-900 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ver la empresa en la TV</h2>
              <button onClick={() => setAbierto(false)} className="text-2xl text-stone-400" aria-label="Cerrar">×</button>
            </div>
            <ol className="mt-3 space-y-2 text-sm text-stone-700">
              <li>
                <b>Con Chromecast o Google TV</b> (misma wifi): {hayCast ? "elegí tu TV en la lista que abre Chrome." : "no veo ninguno ahora; si lo tenés, revisá que esté prendido y en la misma wifi."}
                {pedido.current ? (
                  <button onClick={() => void transmitir()} className="ml-2 rounded-full bg-acopio-700 px-3 py-1 text-xs text-white">Buscar TVs</button>
                ) : null}
              </li>
              <li>
                <b>Cualquier Smart TV</b>: abrí el navegador de la TV en <b>acopiosaludable.com/tv</b>.
              </li>
              <li>En la TV aparece un código de 6 números: escribilo acá.</li>
            </ol>
            <div className="mt-4 flex gap-2">
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="123456"
                className="min-w-0 flex-1 rounded-full border border-stone-300 px-4 py-2 text-center font-mono text-lg tracking-widest"
              />
              <button disabled={codigo.length !== 6} onClick={() => void vincular()} className="rounded-full bg-acopio-700 px-4 py-2 text-sm text-white disabled:opacity-40">Vincular</button>
            </div>
            {estado ? <p className="mt-3 text-sm text-stone-600">{estado}</p> : null}
            <p className="mt-4 text-xs text-stone-400">Para hablar con los agentes usá el micrófono de la compu o del celular; la TV muestra la oficina. Con una TV con AirPlay también podés duplicar la pantalla de la Mac desde el Centro de control.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
