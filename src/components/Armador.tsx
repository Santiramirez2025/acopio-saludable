"use client";

import { useState } from "react";
import type { ProductoTienda } from "@/lib/tienda";
import { pesosCliente } from "./Carrito";
import { PedidoEditable } from "./PedidoEditable";

type Resultado = { lineas: { producto: ProductoTienda; cantidad: number }[]; total: number; compraMinima: number; presupuestoAjustado: boolean };

const PERSONAS = [
  { valor: 8, texto: "Hasta 10" },
  { valor: 20, texto: "11 a 30" },
  { valor: 45, texto: "31 a 60" },
  { valor: 100, texto: "Más de 60" },
];

export function Armador({ nichos, compraMinima, nichoInicial }: { nichos: { id: string; nombre: string }[]; compraMinima: number; nichoInicial: string }) {
  const [nicho, setNicho] = useState(nichoInicial);
  const [personas, setPersonas] = useState(0);
  const [presupuesto, setPresupuesto] = useState(String(compraMinima));
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const opcion = (activa: boolean) =>
    `min-h-[48px] rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${activa ? "border-acopio-600 bg-acopio-600 text-white" : "border-tierra-200 bg-white hover:border-acopio-500"}`;

  async function armar() {
    setError("");
    setCargando(true);
    try {
      const r = await fetch("/api/armador", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nicho, personas, presupuesto: Number(presupuesto) }) });
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.error ?? "No pudimos armar el pedido");
      if (!datos.lineas.length) throw new Error("Todavía no tenemos productos cargados para ese rubro.");
      setResultado(datos);
    } catch (e) {
      setResultado(null);
      setError(e instanceof Error ? e.message : "No pudimos armar el pedido");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 font-display text-lg font-semibold">1. ¿Para qué tipo de negocio es?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {nichos.map((n) => (
            <button type="button" key={n.id} aria-pressed={nicho === n.id} className={opcion(nicho === n.id)} onClick={() => setNicho(n.id)}>{n.nombre}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 font-display text-lg font-semibold">2. ¿Cuántas personas o plazas?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PERSONAS.map((p) => (
            <button type="button" key={p.valor} aria-pressed={personas === p.valor} className={opcion(personas === p.valor)} onClick={() => setPersonas(p.valor)}>{p.texto}</button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="presupuesto" className="mb-2 block font-display text-lg font-semibold">3. ¿Qué presupuesto tenés?</label>
        <div className="flex max-w-xs items-center gap-2">
          <span className="text-stone-600">$</span>
          <input id="presupuesto" className="campo" inputMode="numeric" value={presupuesto} onChange={(e) => setPresupuesto(e.target.value.replace(/[^\d]/g, ""))} />
        </div>
        <p className="mt-1 text-xs text-stone-600">La compra mínima es de {pesosCliente(compraMinima)}.</p>
      </div>
      <button type="button" className="btn" disabled={!nicho || !personas || !presupuesto || cargando} onClick={armar}>
        {cargando ? "Armando…" : "Ver pedido sugerido"}
      </button>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {resultado && (
        <section aria-live="polite">
          <h2 className="mb-1 font-display text-2xl font-semibold text-acopio-900">Tu pedido sugerido</h2>
          {resultado.presupuestoAjustado && (
            <p className="mb-2 text-sm text-tierra-700">Tu presupuesto está por debajo de la compra mínima, así que lo armamos para llegar a {pesosCliente(resultado.compraMinima)}.</p>
          )}
          <PedidoEditable key={JSON.stringify(resultado.lineas.map((l) => [l.producto.codigo, l.cantidad]))} items={resultado.lineas} compraMinima={resultado.compraMinima} etiqueta="Cargar al carrito" />
        </section>
      )}
    </div>
  );
}
