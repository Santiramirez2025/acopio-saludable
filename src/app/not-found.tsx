import Link from "next/link";

export default function NoEncontrada() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="font-display text-6xl font-extrabold text-acopio-700">404</p>
      <h1 className="mt-3 text-2xl font-semibold">Esa página no existe (o ya no está)</h1>
      <p className="mt-2 text-stone-600">Puede que el producto haya cambiado de código o que el link esté mal escrito.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn">Ir al inicio</Link>
        <Link href="/combos" className="btn-sec">Ver los combos</Link>
        <Link href="/catalogo" className="btn-sec">Buscar en el catálogo</Link>
      </div>
      <p className="mt-8 text-sm text-stone-600">¿No encontrás algo? Escribinos por WhatsApp y te lo buscamos.</p>
    </main>
  );
}
