"use client";
// La Nutri de Acopio: un personaje dibujado (no es una persona real) que explica qué aporta cada producto
// y por qué lo vendemos. Santiago, 9/11: «que aparezca un médico y te muestre cosas, por qué lo saludable».
// Las barras se animan cuando entran en pantalla y el globo se escribe solo; todo respeta
// prefers-reduced-motion. Sin librerías: CSS y un IntersectionObserver.

import { useEffect, useRef, useState } from "react";
import type { Nutrientes } from "@/lib/nutrientes";

/** Dibujo propio: nutricionista con guardapelo y una nuez en la mano. */
export function DibujoNutri({ className = "", hablando = false }: { className?: string; hablando?: boolean }) {
  return (
    <svg viewBox="0 0 120 140" className={className} aria-hidden="true" role="img">
      <defs>
        <linearGradient id="nutri-piel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3C9A6" />
          <stop offset="1" stopColor="#E3AF86" />
        </linearGradient>
      </defs>
      {/* sombra */}
      <ellipse cx="60" cy="134" rx="30" ry="4" fill="#10251C" opacity=".12" />
      {/* cuerpo: guardapolvo */}
      <path d="M30 138 L34 86 Q60 78 86 86 L90 138 Z" fill="#FFFFFF" stroke="#D2E2D8" strokeWidth="2" />
      <path d="M60 84 L60 138" stroke="#D2E2D8" strokeWidth="2" />
      {/* remera verde */}
      <path d="M48 84 Q60 98 72 84 L72 96 Q60 104 48 96 Z" fill="#1B8A63" />
      {/* bolsillo con lapicera */}
      <rect x="68" y="100" width="14" height="12" rx="2" fill="#F1F6F2" stroke="#D2E2D8" />
      <rect x="73" y="95" width="2.5" height="12" rx="1" fill="#0F6B4F" />
      {/* brazo con nuez */}
      <path d="M86 92 Q104 100 100 116" stroke="#FFFFFF" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M86 92 Q104 100 100 116" stroke="#D2E2D8" strokeWidth="13" strokeLinecap="round" fill="none" opacity=".5" />
      <path d="M86 92 Q104 100 100 116" stroke="#FFFFFF" strokeWidth="11" strokeLinecap="round" fill="none" />
      <circle cx="100" cy="118" r="5.5" fill="url(#nutri-piel)" />
      <ellipse cx="104" cy="112" rx="6" ry="5" fill="#A66F00" />
      <path d="M100 112 Q104 108 108 112 Q104 116 100 112" fill="#6B4A00" opacity=".6" />
      {/* cuello */}
      <rect x="54" y="72" width="12" height="12" fill="url(#nutri-piel)" />
      {/* cabeza */}
      <ellipse cx="60" cy="54" rx="22" ry="24" fill="url(#nutri-piel)" />
      {/* pelo recogido */}
      <path d="M38 50 Q40 26 60 26 Q80 26 82 50 Q74 42 60 42 Q46 42 38 50 Z" fill="#4A2E1F" />
      <circle cx="60" cy="27" r="8" fill="#4A2E1F" />
      {/* ojos */}
      <ellipse cx="51" cy="56" rx="2.6" ry={hablando ? 3.2 : 3} fill="#10251C" className="nutri-ojo" />
      <ellipse cx="69" cy="56" rx="2.6" ry={hablando ? 3.2 : 3} fill="#10251C" className="nutri-ojo" />
      <circle cx="52" cy="55" r=".9" fill="#fff" />
      <circle cx="70" cy="55" r=".9" fill="#fff" />
      {/* cejas */}
      <path d="M47 50 Q51 48 55 50" stroke="#4A2E1F" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M65 50 Q69 48 73 50" stroke="#4A2E1F" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* mejillas */}
      <circle cx="46" cy="63" r="3.5" fill="#F2A08C" opacity=".55" />
      <circle cx="74" cy="63" r="3.5" fill="#F2A08C" opacity=".55" />
      {/* boca */}
      {hablando ? <ellipse cx="60" cy="67" rx="4.5" ry="3" fill="#8A3B2E" className="nutri-boca" /> : <path d="M54 66 Q60 71 66 66" stroke="#8A3B2E" strokeWidth="1.8" fill="none" strokeLinecap="round" />}
      {/* estetoscopio */}
      <path d="M48 86 Q46 104 56 108" stroke="#10251C" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="57" cy="110" r="3.5" fill="#10251C" />
      <circle cx="57" cy="110" r="1.6" fill="#1B8A63" />
    </svg>
  );
}

/** Texto que se escribe solo. Con reduced-motion aparece entero. */
export function Globo({ texto, className = "" }: { texto: string; className?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reducido = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducido) { setN(texto.length); setVisto(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setVisto(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [texto]);
  useEffect(() => {
    if (!visto || n >= texto.length) return;
    const t = setTimeout(() => setN((x) => Math.min(texto.length, x + 2)), 18);
    return () => clearTimeout(t);
  }, [visto, n, texto]);
  return (
    <div ref={ref} className={`relative rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-[15px] leading-snug text-stone-800 shadow-ficha ${className}`}>
      <span aria-hidden="true" className="absolute -left-2 bottom-3 h-4 w-4 rotate-45 bg-white" />
      <span className="sr-only">{texto}</span>
      <span aria-hidden="true">{texto.slice(0, n)}<span className={n < texto.length ? "animate-pulse" : "hidden"}>▍</span></span>
    </div>
  );
}

const BARRAS: { k: keyof Pick<Nutrientes, "proteina" | "grasa" | "carbohidratos" | "fibra">; nombre: string; max: number; color: string; nota: string }[] = [
  { k: "proteina", nombre: "Proteína", max: 10, color: "bg-acopio-600", nota: "lo que construye músculo" },
  { k: "grasa", nombre: "Grasas buenas", max: 20, color: "bg-sol", nota: "las del fruto seco, no las de la fritura" },
  { k: "fibra", nombre: "Fibra", max: 6, color: "bg-tierra-500", nota: "sacia y cuida el intestino" },
  { k: "carbohidratos", nombre: "Carbohidratos", max: 25, color: "bg-stone-400", nota: "la energía" },
];

export function PanelNutri({ n, producto }: { n: Nutrientes; producto: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [activo, setActivo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setActivo(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} className="rounded-3xl bg-acopio-50 p-4 sm:p-6" aria-labelledby="nutri-titulo">
      <div className="grid gap-5 md:grid-cols-[120px_1fr] md:items-start">
        <div className="flex items-end gap-3 md:block">
          <DibujoNutri className={`h-28 w-24 shrink-0 md:h-36 md:w-32 ${activo ? "nutri-entra" : ""}`} hablando={activo} />
          <div className="md:mt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-acopio-700">La Nutri de Acopio</p>
            <p className="text-[11px] text-stone-500">Personaje ilustrado. No reemplaza a tu nutricionista.</p>
          </div>
        </div>
        <div className="space-y-4">
          <h2 id="nutri-titulo" className="sr-only">Qué aporta {producto}</h2>
          <Globo texto={`${n.paraQue} ${n.como}`} />
          <div className="rounded-2xl bg-white p-4 shadow-ficha">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-stone-700">Una porción · <span className="text-stone-500">{n.porcion}</span></p>
              <p className="font-display text-2xl font-extrabold tabular-nums text-acopio-900">{n.kcal} <span className="text-sm font-semibold text-stone-500">kcal</span></p>
            </div>
            <ul className="mt-3 space-y-2.5">
              {BARRAS.map((b, i) => {
                const v = n[b.k];
                const pct = Math.max(4, Math.min(100, (v / b.max) * 100));
                return (
                  <li key={b.k} className="grid grid-cols-[7.5rem_1fr_3.2rem] items-center gap-3 text-sm">
                    <span><span className="font-semibold text-stone-800">{b.nombre}</span><span className="hidden text-xs text-stone-500 sm:block">{b.nota}</span></span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-stone-100" role="meter" aria-valuemin={0} aria-valuemax={b.max} aria-valuenow={v} aria-label={b.nombre}>
                      <span className={`block h-full rounded-full ${b.color} nutri-barra`} style={{ width: activo ? `${pct}%` : "0%", transitionDelay: `${i * 120}ms` }} />
                    </span>
                    <span className="text-right tabular-nums text-stone-700">{v} g</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <ul className="grid gap-2 sm:grid-cols-3">
            {n.destacados.map((d, i) => (
              <li key={d} className={`rounded-2xl bg-white p-3 text-sm text-stone-800 shadow-ficha nutri-tarjeta ${activo ? "nutri-tarjeta-entra" : ""}`} style={{ animationDelay: `${300 + i * 140}ms` }}>
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-acopio-500 align-middle" aria-hidden="true" />
                {d}
              </li>
            ))}
          </ul>
          {n.receta && (
            <div className="rounded-2xl bg-white p-4 shadow-ficha">
              <p className="mb-2 text-sm font-semibold text-stone-700">Qué lleva, aproximado</p>
              <div className="flex h-3 w-full overflow-hidden rounded-full" aria-hidden="true">
                {n.receta.map((r, i) => (
                  <span key={r.nombre} title={`${r.nombre} ${r.partes}%`} style={{ width: activo ? `${r.partes}%` : "0%", transitionDelay: `${i * 80}ms` }} className={`nutri-barra ${["bg-acopio-600", "bg-sol", "bg-tierra-500", "bg-acopio-500", "bg-stone-400", "bg-tierra-700"][i % 6]}`} />
                ))}
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
                {n.receta.map((r, i) => (
                  <li key={r.nombre} className="flex items-center gap-1.5"><span className={`inline-block h-2 w-2 rounded-full ${["bg-acopio-600", "bg-sol", "bg-tierra-500", "bg-acopio-500", "bg-stone-400", "bg-tierra-700"][i % 6]}`} aria-hidden="true" />{r.nombre} <span className="tabular-nums">{r.partes}%</span></li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[11px] leading-snug text-stone-500">Valores orientativos por porción, de tablas públicas de composición de alimentos (USDA, ARGENFOODS); el producto real varía por cosecha y origen. Es información sobre lo que aporta el alimento, no una indicación médica.</p>
        </div>
      </div>
    </section>
  );
}
