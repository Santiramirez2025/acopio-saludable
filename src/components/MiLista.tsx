"use client";

import { useState } from "react";
import type { ProductoTienda } from "@/lib/tienda";
import { enlacePedido } from "@/lib/pedido-enlace";
import { pesosCliente } from "./Carrito";
import { PedidoEditable } from "./PedidoEditable";

type Resultado = { lineas: { producto: ProductoTienda; cantidad: number }[]; total: number; compraMinima: number; presupuestoAjustado: boolean };

const PERSONAS = [
  { valor: 1, texto: "1" },
  { valor: 2, texto: "2" },
  { valor: 4, texto: "3 o 4" },
  { valor: 5, texto: "5 o más" },
];
const OBJETIVOS = [
  { id: "desayunos", texto: "Desayunos y meriendas" },
  { id: "snacks", texto: "Snacks saludables" },
  { id: "despensa", texto: "Despensa completa" },
];

export function MiLista({ compraMinima, sitio }: { compraMinima: number; sitio: string }) {
  const PRESUPUESTOS = [compraMinima, 50000, 80000].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  const [personas, setPersonas] = useState(0);
  const [objetivo, setObjetivo] = useState("");
  const [presupuesto, setPresupuesto] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const opcion = (activa: boolean) =>
    `min-h-[48px] rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${activa ? "border-acopio-600 bg-acopio-600 text-white" : "border-tierra-200 bg-white hover:border-acopio-500"}`;

  async function armar() {
    setError("");
    setCargando(true);
    try {
      const r = await fetch("/api/mi-lista", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ personas, objetivo, presupuesto }) });
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.error ?? "No pudimos armar la lista");
      if (!datos.lineas.length) throw new Error("Todavía no tenemos productos para eso. Probá con otra opción.");
      setResultado(datos);
    } catch (e) {
      setResultado(null);
      setError(e instanceof Error ? e.message : "No pudimos armar la lista");
    } finally {
      setCargando(false);
    }
  }

  const link = resultado ? `${sitio}${enlacePedido(resultado.lineas.map((l) => ({ tipo: "producto" as const, id: l.producto.codigo, cantidad: l.cantidad })))}` : "";
  const textoCompartir = `Mi lista saludable del mes en Acopio Saludable (${pesosCliente(resultado?.total ?? 0)}): ${link}`;
  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 font-display text-lg font-semibold">1. ¿Para cuántas personas?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PERSONAS.map((p) => (
            <button type="button" key={p.valor} aria-pressed={personas === p.valor} className={opcion(personas === p.valor)} onClick={() => setPersonas(p.valor)}>{p.texto}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 font-display text-lg font-semibold">2. ¿Qué querés resolver?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {OBJETIVOS.map((o) => (
            <button type="button" key={o.id} aria-pressed={objetivo === o.id} className={opcion(objetivo === o.id)} onClick={() => setObjetivo(o.id)}>{o.texto}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 font-display text-lg font-semibold">3. ¿Cuánto querés gastar en el mes?</legend>
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          {PRESUPUESTOS.map((v) => (
            <button type="button" key={v} aria-pressed={presupuesto === v} className={opcion(presupuesto === v)} onClick={() => setPresupuesto(v)}>{pesosCliente(v)}</button>
          ))}
        </div>
      </fieldset>
      <button type="button" className="btn" disabled={!personas || !objetivo || !presupuesto || cargando} onClick={armar}>
        {cargando ? "Armando tu lista…" : "Ver mi lista"}
      </button>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {resultado && (
        <section aria-live="polite" className="space-y-3">
          <h2 className="font-display text-2xl font-semibold text-acopio-900">Tu lista del mes</h2>
          <p className="text-sm text-stone-600">Productos reales con el precio de hoy. Cambiá cantidades con + y −, y cargala al carrito.</p>
          <PedidoEditable key={JSON.stringify(resultado.lineas.map((l) => [l.producto.codigo, l.cantidad]))} items={resultado.lineas} compraMinima={resultado.compraMinima} etiqueta="Cargar al carrito" />
          <div className="flex flex-wrap gap-2">
            <a className="btn-sec" href={`https://wa.me/?text=${encodeURIComponent(textoCompartir)}`} target="_blank" rel="noopener noreferrer">Compartir por WhatsApp</a>
            <button type="button" className="btn-sec" onClick={copiar}>{copiado ? "¡Link copiado!" : "Guardar el link de mi lista"}</button>
          </div>
        </section>
      )}
    </div>
  );
}
