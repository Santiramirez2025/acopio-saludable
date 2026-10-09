import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { combosTienda } from "@/lib/tienda";
import { pesos } from "@/lib/precios";
import { BotonAgregar } from "@/components/Carrito";
import { Foto } from "@/components/Foto";
import { AvisoSuplementos, Titulo } from "@/components/Tienda";

type Props = { params: Promise<{ slug: string }> };

async function cargar(slug: string) {
  const [c] = await combosTienda({ slug, tipo: "COMBO" });
  return c?.disponible ? c : null;
}

// Combos con una segunda imagen de ambiente en public/img/combos/<slug>-2.webp.
const SEGUNDA_FOTO = new Set(["duo-magnesio", "desayuno-30-dias", "alacena-de-frutos-secos", "arranque-gym"]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await cargar((await params).slug);
  return c ? { title: `Combo ${c.nombre}`, description: `Combo ${c.nombre}: ${c.items.map((i) => i.producto.producto).join(", ")}. Envíos a todo el país.`.slice(0, 155), alternates: { canonical: `/combos/${c.slug}` } } : { title: "Combo no disponible" };
}

export default async function ComboPagina({ params }: Props) {
  const c = await cargar((await params).slug);
  if (!c) notFound();
  return (
    <div className="space-y-6">
      <Link href="/combos" className="-my-3 inline-flex min-h-[48px] items-center text-sm text-stone-600 underline underline-offset-4">← Combos</Link>
      <Titulo sobre="Combo">{c.nombre}</Titulo>
      {c.fotoUrl && (
        <div className={`grid gap-3 ${SEGUNDA_FOTO.has(c.slug) ? "sm:grid-cols-2" : ""}`}>
          <Foto src={c.fotoUrl} alt={`Combo ${c.nombre}`} className={`w-full rounded-3xl ${SEGUNDA_FOTO.has(c.slug) ? "aspect-[4/3]" : "aspect-[16/10] sm:aspect-[21/9]"}`} prioridad sizes="(max-width: 640px) 100vw, 550px" />
          {SEGUNDA_FOTO.has(c.slug) && <Foto src={`/img/combos/${c.slug}-2.webp`} alt="" className="aspect-[4/3] w-full rounded-3xl" sizes="(max-width: 640px) 100vw, 550px" />}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <ul className="divide-y divide-tierra-100 rounded-xl border border-tierra-200 bg-white lg:col-span-2">
          {c.items.map(({ producto: p, cantidad }) => (
            <li key={p.codigo} className="flex items-center gap-3 p-3">
              <Foto src={p.fotoUrl} alt="" etiqueta=" " className="h-16 w-16 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <Link href={`/producto/${encodeURIComponent(p.codigo)}`} className="flex min-h-[48px] items-center text-sm font-medium hover:underline">{cantidad} × {p.producto}</Link>
                <p className="text-xs text-stone-600">{p.marca} · {p.presentacion}</p>
              </div>
              <span className="shrink-0 text-sm tabular-nums text-stone-600">{pesos(p.precio * cantidad)}</span>
            </li>
          ))}
        </ul>
        <div className="h-fit space-y-3 rounded-xl border border-tierra-200 bg-white p-5">
          {c.ahorro > 0 && <p className="text-sm tabular-nums text-stone-600 line-through">{pesos(c.precioLista)}</p>}
          <p className="text-3xl font-semibold tabular-nums">{pesos(c.precio)}</p>
          {c.ahorro > 0 && <p className="text-sm text-acopio-700">Ahorrás {pesos(c.ahorro)} ({c.descuentoPct}%)</p>}
          <BotonAgregar tipo="combo" id={c.slug} etiqueta="Agregar combo" />
          {c.items.some((i) => i.producto.esSuplemento) && <AvisoSuplementos />}
        </div>
      </div>
    </div>
  );
}
