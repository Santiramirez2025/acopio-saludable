import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { esSinTacc, wherePublicado } from "@/lib/filtros-producto";
import { pesos, precioSugerido } from "@/lib/precios";
import { AVISO_SUPLEMENTOS, SITIO, urlSitio } from "@/lib/sitio";

export const metadata = { title: "Lista de precios" };

const ORDEN = ["Frutos secos y mix", "Frutas desecadas", "Semillas y granos", "Cereales y granolas", "Harinas y Féculas", "Legumbres", "Especias", "Café, yerba e infusiones", "Suplementos", "Almacen", "Supermercado", "Panificados", "Repostería", "Chocolates"];
const sinRotulo = (t: string) => t.replace(/sin\s*gluten|sin\s*t\.?a\.?c\.?c\.?|s\/\s*tacc|libre de gluten/gi, "").replace(/\s+/g, " ").trim();

/** Lista de precios para imprimir o guardar como PDF: siempre con los precios vigentes. */
export default async function ListaPrecios() {
  const cfg = await leerConfig();
  const productos = await prisma.product.findMany({
    where: wherePublicado(cfg.margenMinimoPct),
    orderBy: [{ producto: "asc" }, { precioPublico: "asc" }],
    select: { codigo: true, producto: true, presentacion: true, categoria: true, precioPublico: true },
  });
  const categorias = [...new Set(productos.map((p) => p.categoria))].sort((a, b) => (ORDEN.indexOf(a) + 1 || 99) - (ORDEN.indexOf(b) + 1 || 99) || a.localeCompare(b));
  const fecha = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Cordoba" });
  const web = urlSitio().replace(/^https?:\/\//, "");
  const conSugerido = cfg.recargoSugeridoPct > 0;
  return (
    <div className="text-acopio-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-acopio-100 px-4 py-3 text-sm print:hidden">
        <p>
          {productos.length} productos con los precios de hoy{conSugerido ? ` y venta sugerida con ${cfg.recargoSugeridoPct}% de recargo (se cambia en Configuración)` : ""}. Para imprimir o guardar como PDF: Ctrl/Cmd + P, tamaño A4.
        </p>
      </div>
      <header className="mb-4 rounded-2xl bg-acopio-900 p-6 text-white [print-color-adjust:exact]">
        <p className="font-display text-4xl font-extrabold leading-none tracking-tight">acopio<span className="text-sol">.</span></p>
        <h1 className="mt-2 font-display text-xl font-bold">Lista de precios</h1>
        <p className="text-sm text-white/80">Productos saludables por volumen · Vigente al {fecha}</p>
        <p className="mt-2 text-sm font-semibold text-sol">{web}{cfg.whatsapp ? ` · WhatsApp ${cfg.whatsapp}` : ""}</p>
      </header>
      <p className="mb-4 text-xs text-stone-700">
        Compra mínima {pesos(cfg.compraMinima)}, combinando lo que quieras.
        {cfg.descuentoTransferenciaPct > 0 && ` ${cfg.descuentoTransferenciaPct}% menos pagando por transferencia.`} Envíos a todo el país desde {SITIO.base}.
        {conSugerido && " «Sugerido»: precio de venta al público orientativo; cada comercio define el suyo."}
      </p>
      <div className="gap-8 text-[11px] leading-tight sm:columns-2 print:columns-2">
        {categorias.map((c) => {
          const lista = productos.filter((p) => p.categoria === c);
          return (
            <section key={c} className="mb-4">
              <div className="mb-1 flex break-after-avoid items-baseline justify-between border-b-2 border-acopio-900 pb-1">
                <h2 className="font-display text-base font-extrabold">{c === "Almacen" ? "Almacén" : c === "Sin categoría" ? "Otros productos" : c}</h2>
                <span className="text-[10px] text-stone-600">Precio{conSugerido ? " · Sugerido" : ""}</span>
              </div>
              {lista.map((p) => {
                const precio = Number(p.precioPublico);
                const s = precioSugerido(precio, cfg.recargoSugeridoPct);
                return (
                  <div key={p.codigo} className="flex break-inside-avoid items-baseline gap-2 border-b border-tierra-200 py-[3px]">
                    <p className="min-w-0 flex-1">
                      <b className="font-semibold">{sinRotulo(p.producto)}</b> <span className="text-stone-600">{sinRotulo(p.presentacion)}</span>
                      {esSinTacc(p) && <span className="ml-1 whitespace-nowrap rounded bg-acopio-900 px-1 text-[8px] font-bold text-white [print-color-adjust:exact]">SIN TACC</span>}
                    </p>
                    <span className="whitespace-nowrap font-bold tabular-nums">{pesos(precio)}</span>
                    {s && <span className="w-16 whitespace-nowrap text-right tabular-nums text-acopio-600">{pesos(s.sugerido)}</span>}
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
      <p className="mt-4 text-[10px] text-stone-600">
        Precios en pesos argentinos, finales, por unidad de venta indicada. Sujetos a cambio sin previo aviso y a disponibilidad: el precio vigente es el publicado en {web}. «Sin TACC»: producto rotulado sin TACC o sin gluten por su fabricante; verificá siempre el logo oficial en el envase. {AVISO_SUPLEMENTOS}
      </p>
    </div>
  );
}
