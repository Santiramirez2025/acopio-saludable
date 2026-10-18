import type { Metadata } from "next";
import { leerConfig } from "@/lib/config";
import { urlSitio } from "@/lib/sitio";
import { Titulo } from "@/components/Tienda";
import { MiLista } from "@/components/MiLista";

export const metadata: Metadata = {
  title: "Tu compra saludable del mes en 60 segundos",
  description: "Contestá 3 preguntas y te armamos la lista del mes con productos reales y precios de hoy: desayunos, snacks o la despensa completa. La compartís, la guardás o la comprás.",
  alternates: { canonical: "/mi-lista" },
};

export default async function MiListaPagina() {
  const cfg = await leerConfig();
  return (
    <div className="mx-auto max-w-3xl">
      <Titulo sobre="Lista del mes" bajada="Contestá 3 preguntas y te armamos la compra saludable del mes con productos reales y precios de hoy. La ajustás, la compartís o la cargás al carrito.">
        Tu compra del mes, en 60 segundos
      </Titulo>
      <MiLista compraMinima={cfg.compraMinima} sitio={urlSitio()} />
    </div>
  );
}
