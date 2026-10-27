"use client";

import { useState } from "react";
import { WA_TEXTO_SISTEMA } from "@/lib/oferta-sistema";
import { medir } from "@/lib/medicion";

const NUMERO = process.env.NEXT_PUBLIC_WHATSAPP_NUMERO || "5493541519630";
const FACTURACION = ["Menos de $10.000.000", "$10 a $30 millones", "$30 a $100 millones", "Más de $100 millones"];

export function Formulario() {
  const [d, setD] = useState({ nombre: "", cargo: "", empresa: "", rubro: "", ciudad: "", facturacion: FACTURACION[1], telefono: "" });
  const [estado, setEstado] = useState<"" | "mandando" | "listo" | "error">("");
  const campo = (k: keyof typeof d, label: string, placeholder = "") => (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-black/15 px-4 py-3 outline-none focus:border-[#0F6B4F]" />
    </label>
  );
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado("mandando");
    const r = await fetch("/api/leads-sistema", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(d) }).catch(() => null);
    if (!r?.ok) {
      setEstado("error");
      return;
    }
    setEstado("listo");
    // Evento Lead para que Meta pueda optimizar la campaña de Conversiones por este formulario, no solo por vista de página.
    medir("lead_sistema");
    const texto = `${WA_TEXTO_SISTEMA}. Soy ${d.nombre} de ${d.empresa} (${d.rubro}, ${d.ciudad}).`;
    window.location.href = `https://wa.me/${NUMERO}?text=${encodeURIComponent(texto)}`;
  };
  return (
    <form onSubmit={enviar} className="mt-6 grid gap-4 md:grid-cols-2">
      {campo("nombre", "Tu nombre")}
      {campo("cargo", "Tu puesto", "Dueño, gerente…")}
      {campo("empresa", "Empresa")}
      {campo("rubro", "Qué venden", "Distribuidora, clínica, concesionaria…")}
      {campo("ciudad", "Ciudad")}
      <label className="block">
        <span className="text-sm font-semibold">Facturación mensual</span>
        <select value={d.facturacion} onChange={(e) => setD({ ...d, facturacion: e.target.value })} className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3">
          {FACTURACION.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </label>
      {campo("telefono", "Tu WhatsApp", "351 …")}
      <div className="flex items-end">
        <button disabled={estado === "mandando"} className="w-full rounded-xl bg-[#0F6B4F] px-6 py-3 text-lg font-bold text-white disabled:opacity-60">
          {estado === "mandando" ? "Un segundo…" : "Seguir por WhatsApp"}
        </button>
      </div>
      {estado === "error" ? <p className="text-red-600 md:col-span-2">No se pudo mandar. Escribinos directo al WhatsApp con la palabra #agentes.</p> : null}
      {estado === "listo" ? <p className="md:col-span-2">Abriendo WhatsApp… Si no abre, escribinos con la palabra #agentes.</p> : null}
    </form>
  );
}
