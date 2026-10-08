"use client";

import { useActionState } from "react";
import { guardarCombo, type EstadoCombo, type ValoresCombo } from "@/lib/acciones";

export function FormCombo({ id, inicial, nichos }: { id: number | null; inicial: ValoresCombo; nichos: { id: string; nombre: string }[] }) {
  const [estado, accion, enviando] = useActionState<EstadoCombo, FormData>(guardarCombo, null);
  const v = estado?.valores ?? inicial;
  return (
    // La key fuerza a que el formulario tome lo que se había cargado cuando vuelve con un error.
    <form action={accion} key={estado ? JSON.stringify(estado.valores) : "inicial"} className="tarjeta space-y-4">
      {estado?.error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">No se guardó: {estado.error}</p>}
      <input type="hidden" name="id" value={id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiqueta" htmlFor="nombre">Nombre</label>
          <input className="campo" id="nombre" name="nombre" defaultValue={v.nombre} required />
        </div>
        <div>
          <label className="etiqueta" htmlFor="slug">Dirección (opcional)</label>
          <input className="campo" id="slug" name="slug" defaultValue={v.slug} placeholder="Se arma sola desde el nombre" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="tipo">Tipo</label>
          <select className="campo" id="tipo" name="tipo" defaultValue={v.tipo}>
            <option value="COMBO">Combo (se vende como unidad)</option>
            <option value="PEDIDO_NICHO">Pedido tipo de un nicho</option>
          </select>
        </div>
        <div>
          <label className="etiqueta" htmlFor="nicho">Nicho</label>
          <select className="campo" id="nicho" name="nicho" defaultValue={v.nicho}>
            <option value="">Sin nicho</option>
            {nichos.map((n) => (
              <option key={n.id} value={n.id}>{n.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiqueta" htmlFor="descuentoPct">Descuento (%)</label>
          <input className="campo" id="descuentoPct" name="descuentoPct" inputMode="decimal" defaultValue={v.descuentoPct} required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="etiqueta" htmlFor="vigenteDesde">Vigente desde</label>
            <input className="campo" id="vigenteDesde" name="vigenteDesde" type="date" defaultValue={v.vigenteDesde} />
          </div>
          <div>
            <label className="etiqueta" htmlFor="vigenteHasta">Hasta</label>
            <input className="campo" id="vigenteHasta" name="vigenteHasta" type="date" defaultValue={v.vigenteHasta} />
          </div>
        </div>
      </div>
      <div>
        <label className="etiqueta" htmlFor="items">Productos (uno por línea: código x cantidad)</label>
        <textarea className="campo font-mono" id="items" name="items" rows={8} required defaultValue={v.items} placeholder={"3622 x 1\n10041 x 1"} />
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="activo" defaultChecked={v.activo} /> Activo</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="destacado" defaultChecked={v.destacado} /> Destacado en la home</label>
      </div>
      <button className="btn" disabled={enviando}>{enviando ? "Guardando…" : "Guardar combo"}</button>
    </form>
  );
}
