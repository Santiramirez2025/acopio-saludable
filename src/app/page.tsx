import Link from "next/link";

// Portada provisoria. El sitio público (home, catálogo, nichos, carrito) se construye en la Fase 2.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-acopio-600">Villa Carlos Paz, Córdoba</p>
      <h1 className="text-4xl font-semibold text-acopio-900">Acopio Saludable</h1>
      <p className="text-stone-600">Productos saludables por volumen para negocios y familias. Estamos preparando la tienda.</p>
      <Link href="/admin" className="text-sm text-stone-400 underline">
        Panel
      </Link>
    </main>
  );
}
