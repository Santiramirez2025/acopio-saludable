"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Contestar a mano desde el panel y devolverle la charla al bot. */
export function RespuestaWhatsapp({ telefono, estado }: { telefono: string; estado: "bot" | "persona" }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function llamar(cuerpo: Record<string, unknown>) {
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/whatsapp/responder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telefono, ...cuerpo }) });
      const datos = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(datos.error || "No se pudo enviar");
      setTexto("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <form onSubmit={(e) => { e.preventDefault(); if (texto.trim()) llamar({ texto }); }} className="space-y-2">
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} maxLength={4000} placeholder="Escribí tu respuesta. Al mandarla, la charla queda en tus manos y el vendedor se calla." className="campo w-full" />
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={enviando || !texto.trim()} className="btn-comprar">{enviando ? "Enviando…" : "Enviar por WhatsApp"}</button>
          {estado === "persona" ? (
            <button type="button" disabled={enviando} onClick={() => llamar({ accion: "bot" })} className="btn-sec">Devolverle la charla al vendedor</button>
          ) : (
            <button type="button" disabled={enviando} onClick={() => llamar({ accion: "persona" })} className="btn-sec">Tomar la charla (el vendedor se calla)</button>
          )}
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </form>
    </div>
  );
}
