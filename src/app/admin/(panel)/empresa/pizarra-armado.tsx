"use client";

// Pizarra de armado: grande y legible de lejos, para tenerla en la TV mientras se preparan los pedidos.
// Tocá un producto para tildarlo; cuando el pedido está completo, «Listo» lo pasa a PREPARADO (sin avisarle al cliente).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PedidoArmado, Pizarra } from "@/lib/armado";
import { linkRuta } from "@/lib/mapa";
import { Ficha, type AgenteVista } from "./oficina";

function etiquetaCombo(slug: string): string {
  const t = slug.replace(/^c-/, "").replace(/-/g, " ");
  return `Combo ${t.charAt(0).toUpperCase()}${t.slice(1)}`;
}

// Link directo al chat de WhatsApp del cliente (abre la app o WhatsApp Web).
function linkWa(tel: string): string | null {
  const d = (tel ?? "").replace(/\D/g, "");
  return d.length >= 8 ? `https://wa.me/${d}` : null;
}

function Tarjeta({ p, puedeMarcar, alListo }: { p: PedidoArmado; puedeMarcar: boolean; alListo: (id: number) => void }) {
  const clave = `acopio-armado-${p.id}`;
  const [hechos, setHechos] = useState<number[]>([]);
  useEffect(() => {
    try {
      setHechos(JSON.parse(localStorage.getItem(clave) ?? "[]") as number[]);
    } catch {
      setHechos([]);
    }
  }, [clave]);
  const tildar = (i: number) => {
    const n = hechos.includes(i) ? hechos.filter((x) => x !== i) : [...hechos, i];
    setHechos(n);
    try {
      localStorage.setItem(clave, JSON.stringify(n));
    } catch {
      /* sin almacenamiento */
    }
  };
  const completo = p.items.length > 0 && hechos.length >= p.items.length;
  // Agrupa por combo para que se arme junto lo que va junto.
  const grupos = new Map<string, { i: number; it: PedidoArmado["items"][number] }[]>();
  p.items.forEach((it, i) => {
    const g = it.combo ? etiquetaCombo(it.combo) : "Sueltos";
    grupos.set(g, [...(grupos.get(g) ?? []), { i, it }]);
  });
  return (
    <article className={`rounded-3xl border-2 p-5 transition ${completo ? "border-emerald-400 bg-emerald-950/40" : "border-white/10 bg-white/5"}`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="text-3xl font-black tracking-tight">{p.cliente}</div>
          {p.mapa ? (
            <a href={p.mapa} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-base text-sky-200 hover:bg-sky-500/30">📍 {p.direccion.split(", ").slice(0, 2).join(", ")} · Cómo llegar</a>
          ) : (
            <div className="mt-1 text-base text-amber-300/80">📍 Falta la dirección</div>
          )}
          {linkWa(p.telefono) ? (
            <a href={linkWa(p.telefono)!} target="_blank" rel="noopener noreferrer" className="ml-2 mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-base text-emerald-200 hover:bg-emerald-500/30">💬 WhatsApp</a>
          ) : null}
          <div className="text-lg text-white/60">{p.codigo} · {p.zona}{p.estado === "ENVIADO" ? <span className="ml-2 rounded-full bg-sky-400/20 px-2 py-0.5 text-sm text-sky-200">ya le avisamos: va en el reparto de hoy</span> : null}</div>
        </div>
        <div className={`rounded-2xl px-3 py-2 text-right text-lg font-bold ${p.pagado ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-400/20 text-amber-300"}`}>{p.cobrar}</div>
      </header>
      {p.notas ? <div className="mt-3 rounded-xl bg-amber-400/10 px-3 py-2 text-lg text-amber-200">📝 {p.notas}</div> : null}
      {[...grupos.entries()].map(([g, filas]) => (
        <div key={g} className="mt-4">
          {grupos.size > 1 || g !== "Sueltos" ? <div className="mb-1 text-sm font-semibold uppercase tracking-wider text-white/50">{g}</div> : null}
          <ul className="space-y-2">
            {filas.map(({ i, it }) => {
              const ok = hechos.includes(i);
              return (
                <li key={i}>
                  <button onClick={() => tildar(i)} className={`flex w-full items-center gap-4 rounded-2xl px-3 py-2 text-left text-2xl ${ok ? "bg-emerald-500/15 text-white/50 line-through" : "bg-white/5 hover:bg-white/10"}`}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 text-xl ${ok ? "border-emerald-400 bg-emerald-500 text-black" : "border-white/30"}`}>{ok ? "✓" : ""}</span>
                    <span className="w-12 shrink-0 text-right font-black text-amber-300">{it.cantidad}×</span>
                    <span className="min-w-0 flex-1">
                      {it.producto} <span className="text-white/50">{it.presentacion.replace(/^x\s*/i, "")}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {puedeMarcar ? (
        <button onClick={() => alListo(p.id)} disabled={!completo} className="mt-4 w-full rounded-2xl bg-emerald-500 py-3 text-xl font-bold text-black disabled:bg-white/10 disabled:text-white/40">
          {completo ? "✅ Listo, pasar a preparado" : `Faltan ${p.items.length - hechos.length} de ${p.items.length}`}
        </button>
      ) : null}
    </article>
  );
}

export function PizarraArmado({ p, puedeMarcar, volver, gonza }: { p: Pizarra; puedeMarcar: boolean; volver?: string; gonza?: AgenteVista }) {
  const router = useRouter();
  // Hablar con Gonza desde la pizarra: le das órdenes por mensaje o por voz y él coordina con la gente.
  const [charla, setCharla] = useState(false);
  const [error, setError] = useState("");
  const [verTotales, setVerTotales] = useState(true);
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [router]);
  const alListo = async (id: number) => {
    setError("");
    // Si ya figura «Enviado» (le avisaron que sale hoy), queda Enviado y se anota que está armado.
    const estado = p.paraArmar.find((x) => x.id === id)?.estado === "ENVIADO" ? "ENVIADO" : "PREPARADO";
    const r = await fetch("/api/admin/agentes/datos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: "estado", id, estado, silencioso: true, nota: "Armado desde la pizarra" }) });
    if (!r.ok) setError("No pude marcarlo. Probá de nuevo.");
    else {
      try {
        localStorage.removeItem(`acopio-armado-${id}`);
      } catch {
        /* nada */
      }
      router.refresh();
    }
  };
  // Todas las paradas en un solo recorrido: primero Carlos Paz y la zona, Córdoba al final.
  const paradas = [...p.paraArmar, ...p.listos].filter((x) => x.direccion).sort((a, b) => Number(/c[oó]rdoba/i.test(a.zona) && !/carlos paz/i.test(a.zona)) - Number(/c[oó]rdoba/i.test(b.zona) && !/carlos paz/i.test(b.zona)));
  const ruta = linkRuta(paradas.map((x) => x.direccion));
  const [enviado, setEnviado] = useState("");
  const mandarWa = async () => {
    setEnviado("Mandando…");
    const r = await fetch("/api/admin/reparto", { method: "POST" }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { paradas?: number; ok?: boolean } | null;
    setEnviado(r?.ok ? (d?.ok ? `✅ ${d.paradas} paradas a tu WhatsApp` : "⚠️ Revisá WhatsApp: alguna no salió") : "No pude mandarlo");
    setTimeout(() => setEnviado(""), 6000);
  };
  const unidades = p.paraArmar.reduce((s, x) => s + x.items.reduce((a, i) => a + i.cantidad, 0), 0);
  return (
    <main className="min-h-screen bg-[#0d1512] px-6 py-6 text-white lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-amber-300">🚚 Gonza · Pizarra de armado</div>
          <h1 className="text-5xl font-black tracking-tight">{p.paraArmar.length ? `${p.paraArmar.length} ${p.paraArmar.length === 1 ? "pedido" : "pedidos"} para armar` : "Todo armado 🙌"}</h1>
          <div className="mt-1 text-xl text-white/60">{unidades ? `${unidades} productos · ` : ""}listos {p.listos.length} · en camino {p.enCamino.length} · actualizado {p.actualizado}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {gonza ? <button onClick={() => setCharla(true)} className="rounded-full bg-amber-400 px-5 py-3 text-lg font-semibold text-black">💬 Hablar con Gonza</button> : null}
          {puedeMarcar ? <button onClick={() => void mandarWa()} className="rounded-full bg-emerald-500 px-5 py-3 text-lg font-semibold text-black">{enviado || "📲 Reparto a mi WhatsApp"}</button> : null}
          {ruta ? <a href={ruta} target="_blank" rel="noopener noreferrer" className="rounded-full bg-sky-500 px-5 py-3 text-lg font-semibold text-white">🗺️ Ruta del reparto</a> : null}
          <button onClick={() => setVerTotales((v) => !v)} className="rounded-full bg-white/10 px-5 py-3 text-lg">{verTotales ? "Ocultar totales" : "Ver totales"}</button>
          <button onClick={() => router.refresh()} className="rounded-full bg-white/10 px-5 py-3 text-lg">↻</button>
          <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)} className="rounded-full bg-white/10 px-5 py-3 text-lg">⛶</button>
          {volver ? <a href={volver} className="rounded-full bg-white/10 px-5 py-3 text-lg">🕹️ Oficina</a> : null}
        </div>
      </header>
      {error ? <p className="mt-3 text-xl text-red-400">{error}</p> : null}
      {charla && gonza ? <Ficha a={gonza} tv={false} angosta onCerrar={() => setCharla(false)} onCambio={() => router.refresh()} /> : null}

      {verTotales && p.totales.length ? (
        <section className="mt-6 rounded-3xl bg-amber-400/10 p-5">
          <h2 className="text-xl font-bold text-amber-300">Lo que hay que juntar en total</h2>
          <ul className="mt-3 grid gap-x-8 gap-y-2 text-2xl md:grid-cols-2 xl:grid-cols-3">
            {p.totales.map((t) => (
              <li key={t.producto} className="flex gap-3">
                <span className="font-bold">{t.producto}</span>
                <span className="text-white/70">{t.texto}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {p.paraArmar.map((x) => (
          <Tarjeta key={x.id} p={x} puedeMarcar={puedeMarcar} alListo={(id) => void alListo(id)} />
        ))}
      </section>

      {p.listos.length || p.enCamino.length ? (
        <section className="mt-8 grid gap-5 text-xl md:grid-cols-3">
          {[
            ["✅ Listos para salir", p.listos],
            ["🚚 En camino", p.enCamino],
          ].map(([t, lista]) => (
            <div key={t as string} className="rounded-3xl bg-white/5 p-5">
              <h3 className="font-bold">{t as string} ({(lista as PedidoArmado[]).length})</h3>
              <ul className="mt-2 space-y-1 text-white/70">
                {(lista as PedidoArmado[]).map((x) => (
                  <li key={x.id}>
                    {x.cliente} · {x.zona.split(" · ")[0]} · {x.cobrar}
                    {linkWa(x.telefono) ? (
                      <a href={linkWa(x.telefono)!} target="_blank" rel="noopener noreferrer" className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-base text-emerald-200 hover:bg-emerald-500/30">💬</a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
