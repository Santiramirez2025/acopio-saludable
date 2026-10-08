import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { wherePublicado } from "@/lib/filtros-producto";
import { OBJETIVOS } from "@/lib/taxonomia";
import { productosTienda } from "@/lib/tienda";
import { AvisoSuplementos, Titulo } from "@/components/Tienda";
import { ExploradorObjetivos } from "@/components/ExploradorObjetivos";

export const metadata: Metadata = { title: "Comprá por objetivo de bienestar", description: "Recorré el catálogo según lo que estás buscando: productos que la gente elige para cada objetivo de bienestar.", alternates: { canonical: "/objetivos" } };

export default async function Objetivos() {
  const cfg = await leerConfig();
  const grupos = await Promise.all(
    OBJETIVOS.map(async (o) => ({
      id: o.id,
      nombre: o.nombre,
      total: await prisma.product.count({ where: { AND: [wherePublicado(cfg.margenMinimoPct), { objetivos: { has: o.id } }] } }),
      productos: await productosTienda({ where: { objetivos: { has: o.id } }, take: 8 }),
    })),
  );
  return (
    <div className="space-y-8">
      <Titulo sobre="Por objetivo" bajada="Elegí un objetivo y mirá los productos que la gente suele elegir para acompañarlo.">
        Comprá por objetivo de bienestar
      </Titulo>
      <ExploradorObjetivos grupos={grupos} />
      <AvisoSuplementos />
    </div>
  );
}
