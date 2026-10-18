import type { Metadata } from "next";
import { urlSitio } from "@/lib/sitio";
import { Titulo } from "@/components/Tienda";
import { CotizadorHotel } from "@/components/CotizadorHotel";

export const metadata: Metadata = {
  title: "Cotizador de desayunos para hoteles y cabañas",
  description: "Calculá cuánto cuesta el desayuno de tu alojamiento: plazas, ocupación y días. Granola, avena, frutos secos y miel con precios de hoy y entrega en Villa Carlos Paz y Punilla.",
  alternates: { canonical: "/cotizador-hoteles" },
};

export default async function CotizadorHoteles({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const n = (v?: string) => (v && Number(v) > 0 ? Number(v) : undefined);
  return (
    <div className="mx-auto max-w-3xl">
      <Titulo sobre="Para alojamientos" bajada="Cargá plazas, ocupación y días, y te decimos cuánto vas a necesitar y cuánto sale cada desayuno, con precios de hoy. El presupuesto se comparte con un link.">
        ¿Cuánto te cuesta el desayuno?
      </Titulo>
      <CotizadorHotel sitio={urlSitio()} inicial={{ plazas: n(sp.plazas), ocupacion: n(sp.ocupacion), dias: n(sp.dias), insumos: sp.insumos?.split(",").filter(Boolean) }} />
    </div>
  );
}
