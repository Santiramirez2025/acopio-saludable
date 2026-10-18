"use client";

// De dónde vino quien compra. Se guarda en el navegador (sin datos personales) y viaja con el pedido:
// el primer origen y, si después volvió por otro lado, el último. Así el panel sabe qué canal trae
// compradores y cuál no, sin suponer que un clic terminó en venta.

import { useEffect } from "react";

const PRIMERO = "acopio_origen";
const ULTIMO = "acopio_origen_ult";

function describir(url: URL, referrer: string): string | null {
  const q = url.searchParams;
  const utm = [q.get("utm_source"), q.get("utm_medium"), q.get("utm_campaign")].filter(Boolean);
  if (utm.length) return utm.join(" / ").slice(0, 80);
  if (q.get("gclid")) return "google (anuncio)";
  if (q.get("fbclid")) return "meta (anuncio o publicación)";
  if (q.get("ref")) return `link: ${q.get("ref")!.slice(0, 40)}`;
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host === url.hostname.replace(/^www\./, "")) return null;
    if (/google\./.test(host)) return "google (orgánico)";
    if (/instagram\./.test(host)) return "instagram";
    if (/facebook\.|fb\./.test(host)) return "facebook";
    if (/whatsapp\.|wa\.me/.test(host)) return "whatsapp (link)";
    if (/tiktok\./.test(host)) return "tiktok";
    if (/youtube\./.test(host)) return "youtube";
    return host.slice(0, 60);
  } catch {
    return null;
  }
}

export function Origen() {
  useEffect(() => {
    try {
      const actual = describir(new URL(window.location.href), document.referrer);
      if (!actual) return;
      const ahora = `${actual} · ${new Date().toISOString().slice(0, 10)}`;
      if (!localStorage.getItem(PRIMERO)) localStorage.setItem(PRIMERO, ahora);
      localStorage.setItem(ULTIMO, ahora);
    } catch {
      // sin almacenamiento (modo privado): el pedido sale como «web · directo»
    }
  }, []);
  return null;
}

export function leerOrigen(): string {
  try {
    const primero = localStorage.getItem(PRIMERO);
    const ultimo = localStorage.getItem(ULTIMO);
    if (!primero) return "web · directo";
    return ultimo && ultimo !== primero ? `${primero} → ${ultimo}` : primero;
  } catch {
    return "web · directo";
  }
}
