import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  ["/admin", "Resumen"],
  ["/admin/productos", "Productos"],
  ["/admin/combos", "Combos"],
  ["/admin/importar", "Importar"],
  ["/admin/configuracion", "Configuración"],
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="font-semibold text-acopio-700">Acopio Saludable</Link>
          <nav className="flex flex-wrap gap-4 text-sm text-stone-600">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-acopio-700">{label}</Link>
            ))}
          </nav>
          <span className="ml-auto text-xs text-stone-400">{session.user?.email}</span>
          <Link href="/api/auth/signout" className="text-xs text-stone-500 underline">Salir</Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
