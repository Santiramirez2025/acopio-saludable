import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sincronizadoHoy } from "@/lib/sync";
import { InstalarPanel } from "@/components/InstalarPanel";

export const dynamic = "force-dynamic";

/**
 * El panel se instala como app aparte de la tienda: manifest propio y icono propio.
 * `appleWebApp` es lo que hace que en iPhone, al agregarlo a la pantalla de inicio,
 * se abra sin la barra de Safari y con el icono del panel.
 */
export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel" },
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Panel", statusBarStyle: "black-translucent" },
  icons: { apple: "/panel-192.png", icon: "/panel-192.png" },
  robots: { index: false, follow: false },
};

const NAV = [
  ["/admin", "Resumen"],
  ["/admin/pedidos", "Pedidos"],
  ["/admin/whatsapp", "Mensajes"],
  ["/admin/productos", "Productos"],
  ["/admin/imagenes", "Imágenes"],
  ["/admin/combos", "Combos"],
  ["/admin/lista-precios", "Lista de precios"],
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
      <InstalarPanel />
      {!preciosAlDia && (
        <Link href="/admin/actualizaciones" className="block bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900 print:hidden">
          Sincronizá los precios de hoy →
        </Link>
      )}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
