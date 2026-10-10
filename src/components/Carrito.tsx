"use client";

import { medir } from "@/lib/medicion";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Cotizacion } from "@/lib/tienda";
import type { LineaEntrada } from "@/lib/tienda-saneo";

const CLAVE = "acopio-carrito-v1";
const MAX = 999;

type Ctx = {
  lineas: LineaEntrada[];
  listo: boolean;
  cotizacion: Cotizacion | null;
  cotizando: boolean;
  agregar: (nuevas: LineaEntrada[]) => void;
  fijar: (tipo: LineaEntrada["tipo"], id: string, cantidad: number) => void;
  vaciar: () => void;
};

const CarritoCtx = createContext<Ctx | null>(null);

export function useCarrito(): Ctx {
  const c = useContext(CarritoCtx);
  if (!c) throw new Error("useCarrito fuera de <ProveedorCarrito>");
  return c;
}

export function ProveedorCarrito({ children }: { children: React.ReactNode }) {
  const [lineas, setLineas] = useState<LineaEntrada[]>([]);
  const [listo, setListo] = useState(false);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [cotizando, setCotizando] = useState(false);
  const pedido = useRef(0);

  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
      if (Array.isArray(guardado)) setLineas(guardado.filter((l) => l && typeof l.id === "string" && l.cantidad > 0));
    } catch {
      /* carrito vacío */
    }
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(lineas));
    } catch {
      /* sin almacenamiento: el carrito vive en memoria */
    }
    const n = ++pedido.current;
    setCotizando(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/carrito", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lineas }) });
        if (!r.ok) throw new Error();
        const datos: Cotizacion = await r.json();
        if (n === pedido.current) setCotizacion(datos);
      } catch {
        /* se reintenta con el próximo cambio */
      } finally {
        if (n === pedido.current) setCotizando(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [lineas, listo]);

  const agregar = useCallback((nuevas: LineaEntrada[]) => {
    medir("agregar", { ids: nuevas.map((l) => l.id) });
    setLineas((prev) => {
      const out = prev.map((l) => ({ ...l }));
      for (const n of nuevas) {
        if (!(n.cantidad > 0)) continue;
        const existente = out.find((l) => l.tipo === n.tipo && l.id === n.id);
        if (existente) existente.cantidad = Math.min(MAX, existente.cantidad + n.cantidad);
        else out.push({ tipo: n.tipo, id: n.id, cantidad: Math.min(MAX, n.cantidad) });
      }
      return out;
    });
  }, []);

  const fijar = useCallback((tipo: LineaEntrada["tipo"], id: string, cantidad: number) => {
    setLineas((prev) =>
      cantidad <= 0
        ? prev.filter((l) => !(l.tipo === tipo && l.id === id))
        : prev.map((l) => (l.tipo === tipo && l.id === id ? { ...l, cantidad: Math.min(MAX, Math.floor(cantidad)) } : l)),
    );
  }, []);

  const vaciar = useCallback(() => setLineas([]), []);

  const valor = useMemo(() => ({ lineas, listo, cotizacion, cotizando, agregar, fijar, vaciar }), [lineas, listo, cotizacion, cotizando, agregar, fijar, vaciar]);
  return <CarritoCtx.Provider value={valor}>{children}</CarritoCtx.Provider>;
}

export function pesosCliente(n: number): string {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

/** Barra de progreso hacia la compra mínima. */
export function BarraMinimo({ compacta = false }: { compacta?: boolean }) {
  const { cotizacion } = useCarrito();
  if (!cotizacion) return compacta ? null : <div className="h-12" />;
  const { progresoPct, falta, compraMinima, subtotal } = cotizacion;
  return (
    <div aria-live="polite">
      {!compacta && (
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium">
            {falta > 0 ? `Te faltan ${pesosCliente(falta)} para la compra mínima` : "Llegaste a la compra mínima"}
          </span>
          <span className="tabular-nums text-stone-600">
            {pesosCliente(subtotal)} / {pesosCliente(compraMinima)}
          </span>
        </div>
      )}
      <div
        className={`w-full overflow-hidden rounded-full bg-tierra-200 ${compacta ? "h-1" : "h-3"}`}
        role="progressbar"
        aria-valuenow={progresoPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso hacia la compra mínima"
      >
        <div className={`h-full rounded-full transition-all ${falta > 0 ? "bg-sol-oscuro" : "bg-acopio-500"}`} style={{ width: `${progresoPct}%` }} />
      </div>
    </div>
  );
}

export function BotonAgregar({
  tipo = "producto",
  id,
  etiqueta = "Agregar",
  conCantidad = true,
  className = "",
}: {
  tipo?: LineaEntrada["tipo"];
  id: string;
  etiqueta?: string;
  conCantidad?: boolean;
  className?: string;
}) {
  const { agregar } = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {conCantidad && (
        <div className="flex items-center rounded-full border border-tierra-200 bg-white">
          <button type="button" className="paso" aria-label="Restar" onClick={() => setCantidad((c) => Math.max(1, c - 1))}>−</button>
          <input
            className="w-11 h-12 border-0 bg-transparent p-0 text-center text-sm font-semibold tabular-nums"
            inputMode="numeric"
            aria-label="Cantidad"
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(1, Math.min(MAX, Number.parseInt(e.target.value, 10) || 1)))}
          />
          <button type="button" className="paso" aria-label="Sumar" onClick={() => setCantidad((c) => Math.min(MAX, c + 1))}>+</button>
        </div>
      )}
      <button
        type="button"
        className="btn-comprar flex-1 whitespace-nowrap"
        onClick={() => {
          agregar([{ tipo, id, cantidad }]);
          setAgregado(true);
          setTimeout(() => setAgregado(false), 1500);
        }}
      >
        {agregado ? "Agregado ✓" : etiqueta}
      </button>
    </div>
  );
}

/** Carga varias líneas de una (pedido tipo, armador). */
export function BotonCargarPedido({ lineas, etiqueta, className = "btn-comprar" }: { lineas: LineaEntrada[]; etiqueta: string; className?: string }) {
  const { agregar } = useCarrito();
  const [hecho, setHecho] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={!lineas.length}
      onClick={() => {
        agregar(lineas);
        setHecho(true);
        setTimeout(() => (window.location.href = "/carrito"), 400);
      }}
    >
      {hecho ? "Cargado ✓" : etiqueta}
    </button>
  );
}


/**
 * Botón de la tarjeta de producto. Un toque agrega; una vez en el carrito se convierte en
 * contador (− n +) para sumar o restar sin salir del listado.
 */
export function AgregarRapido({ id, nombre }: { id: string; nombre: string }) {
  const { lineas, agregar, fijar } = useCarrito();
  const n = lineas.find((l) => l.tipo === "producto" && l.id === id)?.cantidad ?? 0;
  if (n === 0) {
    return (
      <button type="button" className="btn-comprar w-full" aria-label={`Agregar ${nombre} al pedido`} onClick={() => agregar([{ tipo: "producto", id, cantidad: 1 }])}>
        Agregar
      </button>
    );
  }
  return (
    <div className="flex min-h-[48px] items-center justify-between rounded-full bg-acopio-900 text-white">
      <button type="button" className="h-12 w-12 text-xl" aria-label={`Restar ${nombre}`} onClick={() => fijar("producto", id, n - 1)}>−</button>
      <span className="text-sm font-bold tabular-nums" aria-live="polite">{n} en tu pedido</span>
      <button type="button" className="h-12 w-12 text-xl" aria-label={`Sumar ${nombre}`} onClick={() => fijar("producto", id, n + 1)}>+</button>
    </div>
  );
}
