"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProductoTienda } from "@/lib/tienda";
import { pesosCliente } from "./Carrito";
import { PedidoEditable } from "./PedidoEditable";

type Linea = { producto: ProductoTienda; cantidad: number; insumo: string; necesario: string };
type Resultado = { desayunos: number; lineas: Linea[]; total: number; porDesayuno: number; compraMinima: number };

const INSUMOS = [
  ["granola", "Granola"],
  ["avena", "Avena"],
  ["cereales", "Copos y cereales"],
  ["frutos", "Frutos secos"],
  ["miel", "Miel"],
  ["mermelada", "Mermelada"],
  ["te", "Té en saquitos"],
] as const;

export type Inicial = { plazas?: number; ocupacion?: number; dias?: number; insumos?: string[] };

export function CotizadorHotel({ sitio, inicial }: { sitio: string; inicial: Inicial }) {
  const [plazas, setPlazas] = useState(String(inicial.plazas ?? ""));
  const [ocupacion, setOcupacion] = useState(inicial.ocupacion ?? 60);
  const [dias, setDias] = useState(inicial.dias ?? 30);
  const [insumos, setInsumos] = useState<string[]>(inicial.insumos?.length ? inicial.insumos : ["granola", "avena", "cereales", "frutos", "miel", "mermelada"]);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const opcion = (activa: boolean) =>
    `min-h-[44px] rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${activa ? "border-acopio-600 bg-acopio-600 text-white" : "border-tierra-200 bg-white hover:border-acopio-500"}`;

  const calcular = useCallback(async (p: number, o: number, d: number, ins: string[]) => {
    setError("");
    setCargando(true);
    try {
      const r = await fetch("/api/cotizador-hoteles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plazas: p, ocupacion: o, dias: d, insumos: ins }) });
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.error ?? "No pudimos calcular");
      setResultado(datos);
    } catch (e) {
      setResultado(null);
      setError(e instanceof Error ? e.message : "No pudimos calcular");
    } finally {
      setCargando(false);
    }
  }, []);

  // Si llegó por un link de presupuesto, se calcula solo.
  useEffect(() => {
    if (inicial.plazas) void calcular(inicial.plazas, inicial.ocupacion ?? 60, inicial.dias ?? 30, inicial.insumos?.length ? inicial.insumos : insumos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const link = `${sitio}/cotizador-hoteles?plazas=${plazas}&ocupacion=${ocupacion}&dias=${dias}&insumos=${insumos.join(",")}&ref=presupuesto-hotel`;
  const resumen = resultado ? `Presupuesto de desayunos en Acopio Saludable: ${resultado.desayunos} desayunos, ${pesosCliente(resultado.total)} (${pesosCliente(resultado.porDesayuno)} por desayuno). Detalle: ${link}` : "";
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="plazas" className="mb-1 block font-display text-lg font-semibold">Plazas</label>
          <input id="plazas" className="campo" inputMode="numeric" placeholder="Ej: 24" value={plazas} onChange={(e) => setPlazas(e.target.value.replace(/[^\d]/g, ""))} />
          <p className="mt-1 text-xs text-stone-600">Camas o huéspedes que reciben desayuno.</p>
        </div>
        <fieldset>
          <legend className="mb-1 font-display text-lg font-semibold">Ocupación</legend>
          <div className="grid grid-cols-4 gap-1.5">
            {[40, 60, 80, 100].map((v) => (
              <button type="button" key={v} aria-pressed={ocupacion === v} className={opcion(ocupacion === v)} onClick={() => setOcupacion(v)}>{v}%</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1 font-display text-lg font-semibold">Días</legend>
          <div className="grid grid-cols-3 gap-1.5">
            {[7, 15, 30].map((v) => (
              <button type="button" key={v} aria-pressed={dias === v} className={opcion(dias === v)} onClick={() => setDias(v)}>{v}</button>
            ))}
          </div>
        </fieldset>
      </div>
      <fieldset>
        <legend className="mb-2 font-display text-lg font-semibold">¿Qué servís en el desayuno?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {INSUMOS.map(([id, nombre]) => {
            const activo = insumos.includes(id);
            return (
              <button type="button" key={id} aria-pressed={activo} className={opcion(activo)} onClick={() => setInsumos((a) => (activo ? a.filter((x) => x !== id) : [...a, id]))}>{nombre}</button>
            );
          })}
        </div>
      </fieldset>
      <button type="button" className="btn" disabled={!Number(plazas) || !insumos.length || cargando} onClick={() => calcular(Number(plazas), ocupacion, dias, insumos)}>
        {cargando ? "Calculando…" : "Calcular presupuesto"}
      </button>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {resultado && (
        <section aria-live="polite" className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Desayunos", String(resultado.desayunos)],
              ["Total", pesosCliente(resultado.total)],
              ["Por desayuno", pesosCliente(resultado.porDesayuno)],
            ].map(([t, v]) => (
              <div key={t} className="rounded-xl bg-white p-3 shadow-ficha">
                <div className="text-xs uppercase tracking-wide text-stone-600">{t}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{v}</div>
              </div>
            ))}
          </div>
          <ul className="space-y-1 text-sm text-stone-700">
            {resultado.lineas.map((l) => (
              <li key={l.producto.codigo}>{l.insumo}: hacen falta {l.necesario} → {l.cantidad} × {l.producto.producto} {l.producto.presentacion}</li>
            ))}
          </ul>
          {resultado.total < resultado.compraMinima && <p className="text-sm text-tierra-700">No llega a la compra mínima de {pesosCliente(resultado.compraMinima)}: subí los días o sumá algún producto.</p>}
          <PedidoEditable key={JSON.stringify(resultado.lineas.map((l) => [l.producto.codigo, l.cantidad]))} items={resultado.lineas} compraMinima={resultado.compraMinima} etiqueta="Cargar al carrito" />
          <div className="flex flex-wrap gap-2">
            <a className="btn-sec" href={`https://wa.me/?text=${encodeURIComponent(resumen)}`} target="_blank" rel="noopener noreferrer">Enviar el presupuesto por WhatsApp</a>
            <button type="button" className="btn-sec" onClick={copiar}>{copiado ? "¡Link copiado!" : "Copiar link del presupuesto"}</button>
          </div>
          <p className="text-xs text-stone-600">Consumo estimado por desayuno: granola 25 g, avena 20 g, copos 25 g, frutos secos 15 g, miel 10 g, mermelada 20 g y medio saquito de té. Son promedios: ajustá las cantidades a tu servicio. Precios de hoy.</p>
        </section>
      )}
    </div>
  );
}
