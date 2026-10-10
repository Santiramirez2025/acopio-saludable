import type { Metadata } from "next";
import { PaginaLocal } from "@/components/PaginaLocal";

export const metadata: Metadata = {
  title: "Dietética en Villa Carlos Paz con entrega a domicilio",
  description: "Dietética online en Villa Carlos Paz: frutos secos, cereales, harinas, productos sin TACC y suplementos por volumen. Entrega sin cargo en Carlos Paz y sur de Punilla.",
  alternates: { canonical: "/dietetica-villa-carlos-paz" },
};

export default function DieteticaCarlosPaz() {
  return <PaginaLocal />;
}
