"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { medir } from "@/lib/medicion";

/** Cuenta cada cambio de página para Meta (la primera la cuenta el propio píxel). */
export function PaginaVista() {
  const ruta = usePathname();
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    (window as Window & { fbq?: (...a: unknown[]) => void }).fbq?.("track", "PageView");
  }, [ruta]);
  return null;
}

/**
 * Dispara un evento una sola vez al montar. Espera un momento a que carguen los píxeles.
 *
 * Con `clave`, además, una sola vez por navegador para siempre: el link del pedido se vuelve
 * a abrir (mail, historial, WhatsApp) y cada visita contaba otra compra en Meta.
 */
export function Medir({ evento, ids, valor, pedido, clave }: { evento: Parameters<typeof medir>[0]; ids?: string[]; valor?: number; pedido?: string; clave?: string }) {
  const hecho = useRef(false);
  useEffect(() => {
    if (hecho.current) return;
    hecho.current = true;
    const marca = clave ? `acopio-medido-${clave}` : null;
    // Si el navegador no deja guardar (incógnito, cookies bloqueadas), medimos igual: es peor no medir.
    try {
      if (marca && localStorage.getItem(marca)) return;
    } catch {}
    const t = setTimeout(() => {
      medir(evento, { ids, valor, pedido });
      try {
        if (marca) localStorage.setItem(marca, "1");
      } catch {}
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
