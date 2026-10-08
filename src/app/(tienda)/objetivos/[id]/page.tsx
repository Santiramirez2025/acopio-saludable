import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OBJETIVOS } from "@/lib/taxonomia";
import { productosTienda } from "@/lib/tienda";
import { AvisoSuplementos, GrillaProductos, Titulo } from "@/components/Tienda";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const o = OBJETIVOS.find((x) => x.id === id);
  return o ? { title: `Productos que la gente elige para ${o.nombre.toLowerCase()}`, alternates: { canonical: `/objetivos/${o.id}` } } : {};
}

export default async function Objetivo({ params }: Props) {
  const { id } = await params;
  const objetivo = OBJETIVOS.find((x) => x.id === id);
  if (!objetivo) notFound();
  const productos = await productosTienda({ where: { objetivos: { has: objetivo.id } }, take: 96 });
  return (
    <div className="space-y-6">
      <Link href="/objetivos" className="text-sm text-stone-500 underline">← Todos los objetivos</Link>
      <Titulo sobre="Por objetivo">Productos que la gente elige para {objetivo.nombre.toLowerCase()}</Titulo>
      <AvisoSuplementos />
      {productos.length ? <GrillaProductos productos={productos} /> : <p className="text-stone-600">Todavía no hay productos cargados en este objetivo.</p>}
    </div>
  );
}
