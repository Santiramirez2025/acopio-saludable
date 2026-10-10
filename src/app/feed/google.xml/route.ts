import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { wherePublicado } from "@/lib/filtros-producto";
import { aTienda } from "@/lib/tienda";
import { SITIO, urlSitio } from "@/lib/sitio";

export const dynamic = "force-dynamic";

const x = (t: string) => t.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** Catálogo para Google Merchant Center (fichas gratuitas de Shopping). Solo productos publicados y con foto. */
export async function GET() {
  const cfg = await leerConfig();
  const base = urlSitio();
  const filas = await prisma.product.findMany({ where: { AND: [wherePublicado(cfg.margenMinimoPct), { fotoUrl: { not: null } }, { categoria: { not: "Congelados" } }] }, orderBy: { codigo: "asc" } });
  const items = filas.map((f) => {
    const p = aTienda(f, cfg);
    const foto = p.fotoUrl!.startsWith("/") ? `${base}${p.fotoUrl}` : p.fotoUrl!;
    const titulo = `${p.producto} ${p.presentacion}`.slice(0, 150);
    return `<item><g:id>${x(p.codigo)}</g:id><g:title>${x(titulo)}</g:title><g:description>${x(`${titulo}${/sin marca/i.test(p.marca) ? "" : ` de ${p.marca}`}. ${p.categoria}. Entrega sin cargo en Villa Carlos Paz y envíos a todo el país.`)}</g:description><g:link>${base}/producto/${encodeURIComponent(p.codigo)}</g:link><g:image_link>${x(foto)}</g:image_link><g:price>${p.precio.toFixed(2)} ARS</g:price><g:availability>in_stock</g:availability><g:condition>new</g:condition>${/sin marca/i.test(p.marca) ? "" : `<g:brand>${x(p.marca)}</g:brand>`}<g:product_type>${x(p.categoria)}</g:product_type><g:identifier_exists>no</g:identifier_exists></item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${x(SITIO.nombre)}</title><link>${base}</link><description>${x(SITIO.descripcion)}</description>${items.join("")}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
