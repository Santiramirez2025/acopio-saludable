"use client";

import { useEffect, useState } from "react";
import type { LineaEntrada } from "@/lib/tienda-saneo";
import { useCarrito } from "./Carrito";

const IconoWa = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.700-5.100A8.5 8.5 0 1 1 21 11.5Z" /><path d="M9 8.700c-.200 1.500.700 3.300 2.200 4.700s3 2 4.300 1.700" /></svg>
);

/** Carrito o pedido como enlace: `p=3622*2,c-desayuno-30-dias*1`. Los precios nunca viajan: se calculan al abrir. */
export function enlacePedido(lineas: LineaEntrada[]): string {
  return `/carrito?p=${lineas.filter((l) => l.cantidad > 0).map((l) => `${l.tipo === "combo" ? "c-" : ""}${encodeURIComponent(l.id)}*${l.cantidad}`).join(",")}`;
}
export function leerPedido(p: string): LineaEntrada[] {
  return p.split(",").slice(0, 80).flatMap((t) => {
    const [crudo, n] = t.split("*");
    const cantidad = Math.min(999, Number.parseInt(n ?? "1", 10) || 0);
    if (!crudo || cantidad <= 0) return [];
    const combo = crudo.startsWith("c-");
    return [{ tipo: combo ? ("combo" as const) : ("producto" as const), id: decodeURIComponent(combo ? crudo.slice(2) : crudo), cantidad }];
  });
}

/** Comparte por el menú del celular si existe; si no, abre WhatsApp con el mensaje armado. */
export function BotonCompartir({ texto, ruta, etiqueta = "Compartir", className = "btn-sec" }: { texto: string; ruta: string; etiqueta?: string; className?: string }) {
  const compartir = async () => {
    const url = new URL(ruta, window.location.origin).toString();
    if (navigator.share) {
      try { await navigator.share({ text: texto, url }); return; } catch { return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`, "_blank", "noopener");
  };
  return <button type="button" onClick={compartir} className={`${className} gap-2`}><IconoWa />{etiqueta}</button>;
}

/** Botón para mandar el carrito actual como enlace. */
export function CompartirCarrito() {
  const { lineas } = useCarrito();
  if (!lineas.length) return null;
  return <BotonCompartir etiqueta="Enviar este pedido" texto="Te paso este pedido de Acopio Saludable, con los precios de hoy:" ruta={enlacePedido(lineas)} className="btn-sec w-full" />;
}

/** Al abrir un enlace de pedido: lo carga si el carrito está vacío; si no, pregunta antes de tocar nada. */
export function PedidoCompartido() {
  const { lineas, listo, agregar, vaciar } = useCarrito();
  const [recibido, setRecibido] = useState<LineaEntrada[] | null>(null);
  useEffect(() => {
    if (!listo) return;
    const p = new URLSearchParams(window.location.search).get("p");
    if (!p) return;
    const pedido = leerPedido(p);
    window.history.replaceState(null, "", "/carrito");
    if (!pedido.length) return;
    if (lineas.length === 0) agregar(pedido); else setRecibido(pedido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo]);
  if (!recibido) return null;
  return (
    <div role="status" className="mb-4 rounded-2xl bg-acopio-100 p-4">
      <p className="font-semibold text-acopio-900">Te compartieron un pedido de {recibido.length} {recibido.length === 1 ? "producto" : "productos"}.</p>
      <p className="mt-0.5 text-sm text-stone-700">Ya tenías cosas en tu carrito. ¿Qué hacemos?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-comprar" onClick={() => { vaciar(); agregar(recibido); setRecibido(null); }}>Usar el pedido compartido</button>
        <button type="button" className="btn-sec" onClick={() => { agregar(recibido); setRecibido(null); }}>Sumarlo al mío</button>
        <button type="button" className="btn-sec" onClick={() => setRecibido(null)}>Dejar el mío</button>
      </div>
    </div>
  );
}
