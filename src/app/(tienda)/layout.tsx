import Link from "next/link";
import { ProveedorCarrito } from "@/components/Carrito";
import { Encabezado } from "@/components/Encabezado";
import { NICHOS } from "@/lib/taxonomia";
import { AVISO_SUPLEMENTOS, SITIO } from "@/lib/sitio";

export const dynamic = "force-dynamic";

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProveedorCarrito>
      <div className="flex min-h-screen flex-col bg-tierra-50">
        <Encabezado />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-tierra-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-stone-600 sm:grid-cols-3">
            <div>
              <p className="font-display text-lg font-semibold text-acopio-700">{SITIO.nombre}</p>
              <p className="mt-1">{SITIO.base}. Envíos a todo el país.</p>
            </div>
            <div>
              <p className="mb-1 font-medium text-stone-900">Comprá por negocio</p>
              <ul className="grid grid-cols-2 gap-x-4">
                {NICHOS.map((n) => (
                  <li key={n.id}><Link href={`/nichos/${n.id}`} className="hover:underline">{n.nombre}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 font-medium text-stone-900">Importante</p>
              <p>{AVISO_SUPLEMENTOS}</p>
            </div>
          </div>
        </footer>
      </div>
    </ProveedorCarrito>
  );
}
