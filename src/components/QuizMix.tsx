"use client";
// «¿Qué mix sos?»: tres preguntas, una recomendación con el porqué, y el botón para agregarla al pedido.
// Es el juego para quedarse en el sitio (Santiago, 9/11) y a la vez el camino más corto al carrito.

import Link from "next/link";
import { useMemo, useState } from "react";
import { BotonAgregar } from "@/components/Carrito";
import { Foto } from "@/components/Foto";
import { DibujoNutri, Globo, PanelNutri } from "@/components/Nutri";
import { OBJETIVOS_MIX, nutrientesDe, recomendarMix, type ObjetivoMix } from "@/lib/nutrientes";
import { pesos } from "@/lib/precios";

type Prod = { codigo: string; nombre: string; precio: number; foto: string | null };

const MOMENTOS = [
  { id: "manana", nombre: "A la mañana, con el desayuno", emoji: "🌅" },
  { id: "media", nombre: "A media mañana o media tarde", emoji: "☕" },
  { id: "gym", nombre: "Antes o después de entrenar", emoji: "🏃" },
  { id: "noche", nombre: "De noche, en vez de algo dulce", emoji: "🌙" },
] as const;

export function QuizMix({ productos }: { productos: Record<string, Prod> }) {
  const [paso, setPaso] = useState(0);
  const [objetivos, setObjetivos] = useState<ObjetivoMix[]>([]);
  const [momento, setMomento] = useState<string | null>(null);
  const [sinMani, setSinMani] = useState<boolean | null>(null);

  const resultado = useMemo(() => (paso === 3 ? recomendarMix(objetivos, sinMani === true) : null), [paso, objetivos, sinMani]);
  const prod = resultado ? productos[resultado.codigo] : null;
  const suma = resultado?.suma ? productos[resultado.suma.codigo] : null;
  const nutri = resultado ? nutrientesDe(resultado.codigo) : null;

  const alternar = (id: ObjetivoMix) =>
    setObjetivos((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : xs.length >= 2 ? [xs[1], id] : [...xs, id]));

  const reiniciar = () => { setPaso(0); setObjetivos([]); setMomento(null); setSinMani(null); };

  const frase =
    paso === 0 ? "Hola, soy la Nutri de Acopio. Contame qué buscás y en tres preguntas te digo qué te conviene, qué aporta y cómo comerlo. Podés elegir hasta dos."
    : paso === 1 ? "Bien. ¿Y cuándo lo comerías? Eso cambia el tamaño de la porción y con qué va."
    : paso === 2 ? "Última: ¿maní sí o no? Hay gente que no lo come, y tenemos mixes para los dos."
    : resultado ? `${resultado.porQue}` : "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-acopio-700">Un juego de 30 segundos</p>
        <h1 className="mt-1 text-balance font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">¿Qué mix sos?</h1>
      </header>

      {/* progreso */}
      <ol className="flex items-center justify-center gap-2" aria-label="Progreso">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className={`h-1.5 rounded-full transition-all ${i <= paso ? "w-10 bg-acopio-600" : "w-6 bg-tierra-200"}`} aria-current={i === paso ? "step" : undefined} />
        ))}
      </ol>

      <div className="grid gap-4 sm:grid-cols-[96px_1fr] sm:items-start">
        <DibujoNutri className="mx-auto h-28 w-24 sm:h-32 sm:w-28" hablando />
        <Globo key={paso} texto={frase} />
      </div>

      {paso === 0 && (
        <section className="quiz-paso space-y-3" aria-labelledby="q1">
          <h2 id="q1" className="font-semibold text-stone-800">¿Para qué lo querés? <span className="text-sm font-normal text-stone-500">Hasta dos.</span></h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {OBJETIVOS_MIX.map((o) => {
              const on = objetivos.includes(o.id);
              return (
                <li key={o.id}>
                  <button type="button" aria-pressed={on} onClick={() => alternar(o.id)} className={`flex min-h-[64px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${on ? "border-acopio-600 bg-acopio-100" : "border-tierra-200 bg-white hover:border-acopio-500"}`}>
                    <span className="text-2xl" aria-hidden="true">{o.emoji}</span>
                    <span><span className="block font-semibold text-stone-900">{o.nombre}</span><span className="block text-xs text-stone-600">{o.pide}</span></span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="btn-comprar w-full" disabled={!objetivos.length} onClick={() => setPaso(1)}>Siguiente</button>
        </section>
      )}

      {paso === 1 && (
        <section className="quiz-paso space-y-3" aria-labelledby="q2">
          <h2 id="q2" className="font-semibold text-stone-800">¿Cuándo lo comerías?</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {MOMENTOS.map((m) => (
              <li key={m.id}>
                <button type="button" aria-pressed={momento === m.id} onClick={() => { setMomento(m.id); setPaso(2); }} className={`flex min-h-[64px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${momento === m.id ? "border-acopio-600 bg-acopio-100" : "border-tierra-200 bg-white hover:border-acopio-500"}`}>
                  <span className="text-2xl" aria-hidden="true">{m.emoji}</span>
                  <span className="font-semibold text-stone-900">{m.nombre}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-sec w-full" onClick={() => setPaso(0)}>Volver</button>
        </section>
      )}

      {paso === 2 && (
        <section className="quiz-paso space-y-3" aria-labelledby="q3">
          <h2 id="q3" className="font-semibold text-stone-800">¿Comés maní?</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn-comprar min-h-[64px]" onClick={() => { setSinMani(false); setPaso(3); }}>Sí, sin problema</button>
            <button type="button" className="btn-sec min-h-[64px]" onClick={() => { setSinMani(true); setPaso(3); }}>No, sin maní</button>
          </div>
          <button type="button" className="btn-sec w-full" onClick={() => setPaso(1)}>Volver</button>
        </section>
      )}

      {paso === 3 && resultado && (
        <section className="quiz-festejo space-y-5" aria-labelledby="res">
          <div className="rounded-3xl bg-white p-4 shadow-ficha sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-acopio-700">Tu mix</p>
            <div className="mt-2 grid gap-4 sm:grid-cols-[140px_1fr] sm:items-center">
              <Foto src={prod?.foto ?? null} alt={prod?.nombre ?? resultado.titulo} className="aspect-square w-full overflow-hidden rounded-2xl" />
              <div>
                <h2 id="res" className="font-display text-2xl font-extrabold leading-tight">{prod?.nombre ?? resultado.titulo}</h2>
                {prod && <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">{pesos(prod.precio)}</p>}
                {momento === "gym" && <p className="mt-1 text-sm text-stone-600">Para entrenar: un puñado 40 minutos antes, o con el desayuno del día que entrenás.</p>}
                {momento === "noche" && <p className="mt-1 text-sm text-stone-600">De noche: porción chica, 3 o 4 unidades, y mejor con algo caliente.</p>}
                {momento === "manana" && <p className="mt-1 text-sm text-stone-600">Con el desayuno: sobre el yogur, la avena o la fruta.</p>}
                {momento === "media" && <p className="mt-1 text-sm text-stone-600">A media tarde: un frasco a mano y un puñado, no la bolsa entera.</p>}
                {prod && <BotonAgregar id={prod.codigo} etiqueta="Lo quiero" className="mt-4" />}
                {prod && <Link href={`/producto/${encodeURIComponent(prod.codigo)}`} className="mt-2 inline-flex min-h-[48px] items-center text-sm font-semibold text-acopio-700 underline underline-offset-4">Ver la ficha completa</Link>}
              </div>
            </div>
          </div>

          {nutri && prod && <PanelNutri n={nutri} producto={prod.nombre} />}

          {suma && resultado.suma && (
            <div className="rounded-3xl border-2 border-dashed border-tierra-200 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-tierra-700">Le va bien con</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-900">{suma.nombre} <span className="tabular-nums text-stone-600">· {pesos(suma.precio)}</span></p>
                  <p className="text-sm text-stone-600">{resultado.suma.porQue}</p>
                </div>
                <BotonAgregar id={suma.codigo} etiqueta="Sumar" conCantidad={false} />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Link href="/carrito" className="btn-comprar flex-1">Ver mi pedido</Link>
            <button type="button" className="btn-sec" onClick={reiniciar}>Jugar de nuevo</button>
          </div>
          <p className="text-center text-xs text-stone-500">En Carlos Paz y la zona, envío sin cargo desde $20.000. Se paga por transferencia (8% menos) o Mercado Pago.</p>
        </section>
      )}
    </div>
  );
}
