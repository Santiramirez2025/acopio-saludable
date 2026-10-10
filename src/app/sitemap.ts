import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { wherePublicado } from "@/lib/filtros-producto";
import { NICHOS, OBJETIVOS } from "@/lib/taxonomia";
import { combosTienda } from "@/lib/tienda";
import { LOCALIDADES } from "@/lib/localidades";
import { GUIAS } from "@/lib/guias";
import { urlSitio } from "@/lib/sitio";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlSitio();
  const cfg = await leerConfig();
  const [productos, combos, categorias] = await Promise.all([
    prisma.product.findMany({ where: wherePublicado(cfg.margenMinimoPct), select: { codigo: true, updatedAt: true } }),
    combosTienda({ tipo: "COMBO", activo: true }),
    prisma.product.groupBy({ by: ["categoria"], where: wherePublicado(cfg.margenMinimoPct) }),
  ]);
  return [
    ...["", "/catalogo", "/sin-tacc", "/nichos", "/objetivos", "/combos", "/armador", "/dietetica-villa-carlos-paz", "/guias", "/novedades", "/envios", "/cambios-y-devoluciones", "/contacto", "/app", "/terminos", "/privacidad"].map((r) => ({ url: `${base}${r}` })),
    ...categorias.filter((c) => c.categoria !== "Sin categoría").map((c) => ({ url: `${base}/catalogo?categoria=${encodeURIComponent(c.categoria)}` })),
    ...LOCALIDADES.map((l) => ({ url: `${base}/dietetica/${l.slug}` })),
    ...GUIAS.map((g) => ({ url: `${base}/guias/${g.slug}`, lastModified: new Date(g.actualizada) })),
    ...NICHOS.map((n) => ({ url: `${base}/nichos/${n.id}` })),
    ...OBJETIVOS.map((o) => ({ url: `${base}/objetivos/${o.id}` })),
    ...combos.filter((c) => c.disponible).map((c) => ({ url: `${base}/combos/${c.slug}` })),
    ...productos.map((p) => ({ url: `${base}/producto/${encodeURIComponent(p.codigo)}`, lastModified: p.updatedAt })),
  ];
}
