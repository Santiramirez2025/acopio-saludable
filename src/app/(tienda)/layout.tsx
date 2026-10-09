import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ProveedorCarrito } from "@/components/Carrito";
import { BarraInferior, Encabezado, MedidorPedido } from "@/components/Encabezado";
import { NICHOS } from "@/lib/taxonomia";
import { AVISO_SUPLEMENTOS, SITIO } from "@/lib/sitio";

export const dynamic = "force-dynamic";

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProveedorCarrito>
      <div className="flex min-h-screen flex-col overflow-x-clip">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-sol focus:px-4 focus:py-3 focus:font-bold focus:text-acopio-900">Saltar al contenido</a>
        <Encabezado />
        <main id="contenido" className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 pb-40 pt-5 md:pb-24 md:pt-8">{children}</main>
        <footer className="fondo-oscuro bg-acopio-900 pb-28 text-white/80 md:pb-0">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
            <div>
              <p className="text-white"><Logo invertido conBajada /></p>
              <p className="mt-1">{SITIO.base}. Envíos a todo el país.</p>
              <Link href="/sin-tacc" className="flex min-h-[48px] items-center font-semibold text-white underline underline-offset-4">Productos sin TACC</Link>
            </div>
            <div>
              <h2 className="mb-1 font-semibold text-white">Comprá por negocio</h2>
              <ul className="grid grid-cols-2 gap-x-4">
                {NICHOS.map((n) => (
                  <li key={n.id}><Link href={`/nichos/${n.id}`} className="flex min-h-[48px] items-center hover:text-white hover:underline">{n.nombre}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="mb-1 font-semibold text-white">Importante</h2>
              <p>{AVISO_SUPLEMENTOS}</p>
            </div>
          </div>
        </footer>
        <MedidorPedido />
        <BarraInferior />
      </div>
    </ProveedorCarrito>
  );
}
