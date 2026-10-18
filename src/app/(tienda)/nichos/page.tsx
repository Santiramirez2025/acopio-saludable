import type { Metadata } from "next";
import Link from "next/link";
import { NICHOS } from "@/lib/taxonomia";
import { Titulo } from "@/components/Tienda";
import { Foto } from "@/components/Foto";

export const metadata: Metadata = { title: "Comprá por tipo de negocio", description: "Pedidos tipo para hoteles, gimnasios, dietéticas, cafeterías, kioscos, oficinas y familias. Ajustalos y cargalos al carrito de una vez.", alternates: { canonical: "/nichos" } };

export default function Nichos() {
  return (
    <div>
      <Titulo sobre="Por negocio" bajada="Cada rubro tiene su pedido tipo, que podés ajustar antes de cargarlo al carrito, y sus productos recomendados.">
        Comprá por tipo de negocio
      </Titulo>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {NICHOS.map((n) => (
          <Link key={n.id} href={`/nichos/${n.id}`} className="group overflow-hidden rounded-2xl bg-white shadow-ficha transition hover:-translate-y-0.5">
            <Foto src={`/img/nichos/${n.id}.webp`} alt="" etiqueta=" " className="aspect-[16/10] w-full" sizes="(max-width: 640px) 100vw, 300px" />
            <span className="block px-4 pb-4 pt-3">
              <span className="block font-display text-xl font-semibold text-acopio-900">{n.nombre}</span>
              <span className="mt-1 block text-sm font-semibold text-acopio-700 group-hover:underline">Ver pedido y recomendados →</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
