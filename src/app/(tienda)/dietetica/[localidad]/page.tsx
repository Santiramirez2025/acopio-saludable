import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALIDADES } from "@/lib/localidades";
import { PaginaLocal } from "@/components/PaginaLocal";

type Props = { params: Promise<{ localidad: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { localidad } = await params;
  const l = LOCALIDADES.find((x) => x.slug === localidad);
  if (!l) return {};
  return {
    title: `Dietética en ${l.nombre} con ${l.propia ? "entrega" : "envío"} a domicilio`,
    description: `Dietética online para ${l.nombre}: frutos secos, cereales, harinas, productos sin TACC y suplementos por volumen. ${l.propia ? "Entrega sin cargo desde Villa Carlos Paz." : "Envío por correo desde Villa Carlos Paz."}`,
    alternates: { canonical: `/dietetica/${l.slug}` },
  };
}

export default async function DieteticaLocalidad({ params }: Props) {
  const { localidad } = await params;
  const lugar = LOCALIDADES.find((x) => x.slug === localidad);
  if (!lugar) notFound();
  return <PaginaLocal lugar={lugar} />;
}
