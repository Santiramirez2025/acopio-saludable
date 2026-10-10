import type { Metadata } from "next";
import { InstalarEnPagina } from "@/components/InstalarApp";
import { Titulo } from "@/components/Tienda";

export const metadata: Metadata = { title: "Instalá Acopio en tu celular", description: "Cómo agregar Acopio Saludable a la pantalla de inicio de tu iPhone o Android, en tres pasos y sin pasar por la tienda de aplicaciones.", alternates: { canonical: "/app" } };

export default function App() {
  return (
    <div>
      <Titulo sobre="La app" bajada="Acopio se instala desde el navegador en tres pasos. Queda con su ícono en la pantalla de inicio, abre a pantalla completa y tu pedido te espera donde lo dejaste.">Instalá Acopio en tu celular</Titulo>
      <InstalarEnPagina />
      <ul className="mt-8 grid gap-3 text-sm text-stone-700 sm:grid-cols-3">
        {[["Sin tienda de aplicaciones", "No hay que buscarla ni descargar nada pesado."], ["Siempre actualizada", "Precios y catálogo al día cada vez que la abrís."], ["Tu pedido a mano", "Repetís la compra del mes en pocos toques."]].map(([t, d]) => (
          <li key={t} className="rounded-2xl bg-white p-4 shadow-ficha"><b className="block font-display text-base text-acopio-900">{t}</b>{d}</li>
        ))}
      </ul>
    </div>
  );
}
