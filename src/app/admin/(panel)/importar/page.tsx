import { importarCsv, importarFotos } from "@/lib/acciones";

export default async function Importar({ searchParams }: { searchParams: Promise<{ csv?: string; fotos?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Importar</h1>
      {sp.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{sp.error}</p>}
      {sp.csv && <p className="rounded-md bg-acopio-100 px-3 py-2 text-sm text-acopio-700">Catálogo: {sp.csv}</p>}
      {sp.fotos && <p className="rounded-md bg-acopio-100 px-3 py-2 text-sm text-acopio-700">Fotos: {sp.fotos}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <form action={importarCsv} className="tarjeta space-y-3">
          <h2 className="font-semibold">Catálogo (CSV)</h2>
          <p className="text-sm text-stone-500">
            Columnas: codigo, producto, marca, presentacion, categoria, formato, costo, precio_publico, contenido_g_o_ml. Los productos nuevos quedan en
            borrador; en los existentes solo se actualizan los datos del proveedor y cada cambio de precio queda en el historial. Lo que editaste en el
            panel no se pisa.
          </p>
          <input className="campo" type="file" name="archivo" accept=".csv,text/csv" required />
          <button className="btn">Importar catálogo</button>
        </form>

        <form action={importarFotos} className="tarjeta space-y-3">
          <h2 className="font-semibold">Fotos (JSON del proveedor)</h2>
          <p className="text-sm text-stone-500">
            Lista de <code>{"{ sku, photos }"}</code> tal como la devuelve el sistema de Distrimay. Se asigna la foto por código.
          </p>
          <input className="campo" type="file" name="archivo" accept=".json,application/json" required />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="pisar" /> Reemplazar también las fotos que ya están cargadas
          </label>
          <button className="btn">Importar fotos</button>
        </form>
      </div>
    </div>
  );
}
