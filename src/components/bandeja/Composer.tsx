"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Respuestas rápidas: lo que más se escribe a mano. Se insertan en el cuadro para editarlas antes de mandar.
const RAPIDAS = [
  ["Saludo", "¡Hola! Gracias por escribir a Acopio. ¿En qué te puedo ayudar?"],
  ["Envío", "Te lo llevamos sin cargo en Villa Carlos Paz y el sur de Punilla. Al resto del país va por correo y el costo se ve en el carrito con tu código postal."],
  ["Mínimo", "La compra mínima es de $35.000 por pedido, combinando los productos que quieras."],
  ["Pago", "Podés pagar con Mercado Pago (tarjeta, débito o dinero en cuenta) o por transferencia, que tiene descuento."],
  ["Link", "Te paso el link con el pedido armado, así lo pagás directo: "],
  ["Gracias", "¡Gracias por tu compra! Cualquier cosa escribime por acá."],
] as const;

type Props = { clave: string; estado: "bot" | "persona"; noLeidos: number; canal: string; ventanaCerrada: boolean };

/** Contestar a mano, tomar o devolver la charla y marcarla leída al abrirla. */
export function Composer({ clave, estado, noLeidos, canal, ventanaCerrada }: Props) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  async function llamar(cuerpo: Record<string, unknown>, silencioso = false) {
    if (!silencioso) {
      setEnviando(true);
      setError(null);
    }
    try {
      const r = await fetch("/api/admin/whatsapp/responder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telefono: clave, ...cuerpo }) });
      const datos = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(datos.error || "No se pudo enviar");
      if (cuerpo.texto) setTexto("");
      router.refresh();
    } catch (e) {
      if (!silencioso) setError(e instanceof Error ? e.message : "No se pudo enviar");
    } finally {
      if (!silencioso) setEnviando(false);
    }
  }

  // Abrir la charla es leerla: el contador de la lista baja solo.
  useEffect(() => {
    if (noLeidos > 0) void llamar({ accion: "leida" }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  function insertar(t: string) {
    setTexto((v) => (v.trim() ? `${v.trimEnd()} ${t}` : t));
    area.current?.focus();
  }

  return (
    <div className="border-t border-stone-200 bg-white p-3">
      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {RAPIDAS.map(([etiqueta, t]) => (
          <button key={etiqueta} type="button" onClick={() => insertar(t)} className="shrink-0 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700 hover:border-acopio-600 hover:text-acopio-700">
            {etiqueta}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (texto.trim()) void llamar({ texto });
        }}
        className="flex items-end gap-2"
      >
        <textarea
          ref={area}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (texto.trim() && !enviando) void llamar({ texto });
            }
          }}
          rows={2}
          maxLength={4000}
          disabled={ventanaCerrada}
          placeholder={ventanaCerrada ? "Pasaron más de 24 h: Meta no deja escribir hasta que vuelva a escribir." : `Escribí por ${canal}… (Enter manda, Shift+Enter baja de línea)`}
          className="campo min-h-[52px] flex-1 resize-none"
        />
        <button type="submit" disabled={enviando || !texto.trim() || ventanaCerrada} className="btn-comprar min-h-[52px] px-4" aria-label="Enviar">
          {enviando ? "…" : "Enviar"}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
        <span>{estado === "persona" ? "La charla está en tus manos: el vendedor no contesta." : "Contesta el vendedor. Si escribís vos, la charla pasa a tus manos."}</span>
        {estado === "persona" ? (
          <button type="button" disabled={enviando} onClick={() => llamar({ accion: "bot" })} className="font-semibold text-acopio-700 underline">
            Devolvérsela al vendedor
          </button>
        ) : (
          <button type="button" disabled={enviando} onClick={() => llamar({ accion: "persona" })} className="font-semibold text-acopio-700 underline">
            Tomar la charla
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
