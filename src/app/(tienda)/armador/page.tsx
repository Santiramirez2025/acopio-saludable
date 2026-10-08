import type { Metadata } from "next";
import { leerConfig } from "@/lib/config";
import { NICHOS, NICHO_IDS } from "@/lib/taxonomia";
import { Titulo } from "@/components/Tienda";
import { Armador } from "@/components/Armador";

export const metadata: Metadata = { title: "Armá tu pedido en 3 pasos", description: "Contestá 3 preguntas y te sugerimos un pedido de productos saludables que llega a la compra mínima. Después lo ajustás como quieras.", alternates: { canonical: "/armador" } };

export default async function ArmadorPagina({ searchParams }: { searchParams: Promise<{ nicho?: string }> }) {
  const [{ nicho }, cfg] = await Promise.all([searchParams, leerConfig()]);
  return (
    <div className="mx-auto max-w-3xl">
      <Titulo sobre="Armador de pedido" bajada="Contestá 3 preguntas y te sugerimos un pedido que llega a la compra mínima. Después lo ajustás como quieras.">
        Armá tu pedido
      </Titulo>
      <Armador nichos={NICHOS.map((n) => ({ ...n }))} compraMinima={cfg.compraMinima} nichoInicial={NICHO_IDS.includes(nicho ?? "") ? nicho! : ""} />
    </div>
  );
}
