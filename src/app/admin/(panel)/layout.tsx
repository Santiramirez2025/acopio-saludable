import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sincronizadoHoy } from "@/lib/sync";

export const dynamic = "force-dynamic";

const NAV = [
  ["/admin", "Resumen"],
  ["/admin/pedidos", "Pedidos"],
  ["/admin/productos", "Productos"],
  ["/admin/imagenes", "Imágenes"],
  ["/admin/combos", "Combos"],
  ["/admin/actualizaciones", "Actualizaciones"],
  ["/admin/estadisticas", "Estadísticas"],
  ["/admin/envios", "Envíos"],
  ["/admin/importar", "Importar"],
  ["/admin/configuracion", "Configuración"],
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");
  const preciosAlDia = await sincronizadoHoy();
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="font-semibold text-acopio-700">Acopio Saludable</Link>
          <nav className="flex flex-wrap gap-4 text-sm text-stone-600">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-acopio-700">{label}</Link>
            ))}
          </nav>
          <span className="ml-auto text-xs text-stone-500">{session.user?.email}</span>
          <Link href="/api/auth/signout" className="text-xs text-stone-600 underline">Salir</Link>
        </div>
      </header>
      {!preciosAlDia && (
        <Link href="/admin/actualizaciones" className="block bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900 print:hidden">
          Sincronizá los precios de hoy →
        </Link>
      )}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
