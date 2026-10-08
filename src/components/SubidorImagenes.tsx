"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { registrarFotos } from "@/lib/acciones";
import { codigoDesdeArchivo } from "@/lib/imagenes";

type Estado = { archivo: string; codigo: string | null; estado: "pendiente" | "subiendo" | "listo" | "error"; detalle?: string };

export function SubidorImagenes({ codigos }: { codigos: string[] }) {
  const [filas, setFilas] = useState<Estado[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [resumen, setResumen] = useState("");
  const conjunto = new Set(codigos);

  async function subir(archivos: FileList | null) {
    if (!archivos?.length) return;
    setOcupado(true);
    setResumen("");
    const lista = [...archivos].slice(0, 200);
    const inicial: Estado[] = lista.map((f) => {
      const codigo = codigoDesdeArchivo(f.name, conjunto);
      const valido = /\.(png|jpe?g|webp)$/i.test(f.name);
      return { archivo: f.name, codigo, estado: codigo && valido ? "pendiente" : "error", detalle: !valido ? "Formato no admitido (usá PNG, JPG o WebP)" : codigo ? undefined : "El nombre no empieza con un código de producto" };
    });
    setFilas(inicial);
    const subidas: { codigo: string; url: string }[] = [];
    for (let i = 0; i < lista.length; i++) {
      const fila = inicial[i];
      if (fila.estado !== "pendiente" || !fila.codigo) continue;
      setFilas((f) => f.map((x, k) => (k === i ? { ...x, estado: "subiendo" } : x)));
      try {
        const limpio = lista[i].name.replace(/[^\w.-]+/g, "-");
        const blob = await upload(`productos/${fila.codigo}/${limpio}`, lista[i], { access: "public", handleUploadUrl: "/api/admin/blob" });
        subidas.push({ codigo: fila.codigo, url: blob.url });
        setFilas((f) => f.map((x, k) => (k === i ? { ...x, estado: "listo" } : x)));
      } catch (e) {
        setFilas((f) => f.map((x, k) => (k === i ? { ...x, estado: "error", detalle: e instanceof Error ? e.message : "No se pudo subir" } : x)));
      }
    }
    if (subidas.length) {
      const r = await registrarFotos(subidas);
      setResumen(`${r.asignadas} imágenes asignadas a sus productos.`);
    } else setResumen("No se subió ninguna imagen.");
    setOcupado(false);
  }

  return (
    <div className="space-y-3">
      <label className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-tierra-200 bg-acopio-50 px-4 py-8 text-center ${ocupado ? "pointer-events-none opacity-60" : "hover:border-acopio-600"}`}>
        <span className="font-semibold">{ocupado ? "Subiendo…" : "Elegí las imágenes o soltalas acá"}</span>
        <span className="mt-1 text-sm text-stone-500">Varias a la vez. El nombre tiene que empezar con el código: 3622-1.png, 3622-2.png, 00000010-hero.jpg</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" disabled={ocupado} onChange={(e) => subir(e.target.files)} />
      </label>
      {resumen && <p role="status" className="rounded-md bg-acopio-100 px-3 py-2 text-sm text-acopio-700">{resumen}</p>}
      {filas.length > 0 && (
        <ul className="max-h-72 overflow-y-auto rounded-xl border border-tierra-200 bg-white text-sm">
          {filas.map((f) => (
            <li key={f.archivo} className="flex items-center justify-between gap-3 border-b border-stone-100 px-3 py-1.5">
              <span className="truncate">{f.archivo}{f.codigo ? <span className="text-stone-400"> → {f.codigo}</span> : null}</span>
              <span className={f.estado === "error" ? "text-red-600" : f.estado === "listo" ? "text-acopio-600" : "text-stone-500"}>{f.estado === "error" ? f.detalle : f.estado === "listo" ? "Lista" : f.estado === "subiendo" ? "Subiendo…" : "En cola"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
