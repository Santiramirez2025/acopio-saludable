import type { Metadata } from "next";
import Link from "next/link";
import { NICHOS } from "@/lib/taxonomia";
import { Titulo } from "@/components/Tienda";

export const metadata: Metadata = { title: "Comprá por tipo de negocio", description: "Pedidos tipo para hoteles, gimnasios, dietéticas, cafeterías, kioscos, oficinas y familias. Ajustalos y cargalos al carrito de una vez.", alternates: { canonical: "/nichos" } };

export default function Nichos() {
  return (
    <div>
      <Titulo sobre="Por negocio" bajada="Cada rubro tiene su pedido tipo, que podés ajustar antes de cargarlo al carrito, y sus productos recomendados.">
        Comprá por tipo de negocio
      </Titulo>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {NICHOS.map((n) => (
          <Link key={n.id} href={`/nichos/${n.id}`} className="rounded-xl border border-tierra-200 bg-white p-5 hover:border-acopio-500">
            <span className="font-display text-xl font-semibold text-acopio-900">{n.nombre}</span>
            <span className="mt-2 block text-sm text-acopio-700 underline">Ver pedido y recomendados</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
