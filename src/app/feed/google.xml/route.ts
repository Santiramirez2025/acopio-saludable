import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { wherePublicado } from "@/lib/filtros-producto";
import { aTienda, combosTienda } from "@/lib/tienda";
import { pesoCombo, seoCombo } from "@/lib/combo-seo";
import { medida } from "@/lib/precios";
import { SITIO, urlSitio } from "@/lib/sitio";
import { descripcionFeed, tituloLimpio } from "@/lib/producto-ld";
import { PRODUCTOS_PROVEEDORES } from "@/lib/catalogo-proveedores";

export const dynamic = "force-dynamic";

const x = (t: string) => t.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

// Google rechaza como «drogas ilegales» todo lo que nombre cannabis o cáñamo, aunque sea harina o semilla: no se manda.
const NO_ENVIAR = /can+abis|c[aá]ñamo|hemp/i;

/** Catálogo para Google Merchant Center (fichas gratuitas de Shopping). Solo productos publicados y con foto. */
export async function GET() {
  const cfg = await leerConfig();
  const base = urlSitio();
  const filas = await prisma.product.findMany({ where: { AND: [wherePublicado(cfg.margenMinimoPct), { fotoUrl: { not: null } }, { categoria: { not: "Congelados" } }] }, orderBy: { codigo: "asc" } });
  const items = filas.filter((f) => !NO_ENVIAR.test(`${f.producto} ${f.presentacion}`)).map((f) => {
    const p = aTienda(f, cfg);
    const foto = p.fotoUrl!.startsWith("/") ? `${base}${p.fotoUrl}` : p.fotoUrl!;
    const titulo = tituloLimpio(`${p.producto} ${p.presentacion}`).slice(0, 150);
    // Misma descripción que la ficha (y que su JSON-LD): el «por qué lo elegimos» si existe.
    const porQue = f.porQueLoElegimos ?? PRODUCTOS_PROVEEDORES.find((q) => q.codigo === f.codigo)?.porQueLoElegimos ?? null;
    // «Sin categoría» es un hueco del catálogo, no un dato: no se le muestra a Google.
    const cat = /^sin categor/i.test(p.categoria ?? "") ? "" : p.categoria;
    return `<item><g:id>${x(p.codigo)}</g:id><g:title>${x(titulo)}</g:title><g:description>${x(descripcionFeed(titulo, cat, p.marca, porQue))}</g:description><g:link>${base}/producto/${encodeURIComponent(p.codigo)}</g:link><g:image_link>${x(foto)}</g:image_link><g:price>${p.precio.toFixed(2)} ARS</g:price><g:availability>in_stock</g:availability><g:condition>new</g:condition>${/sin marca/i.test(p.marca) ? "" : `<g:brand>${x(p.marca)}</g:brand>`}${cat ? `<g:product_type>${x(cat)}</g:product_type>` : ""}<g:identifier_exists>no</g:identifier_exists></item>`;
  });
  // Los combos también van: Despensa 4 kg es lo más vendido. Se marcan como paquete armado por nosotros (is_bundle).
  const combos = (await combosTienda({ tipo: "COMBO", activo: true }))
    .filter((c) => c.disponible && c.fotoUrl && !c.items.some((i) => NO_ENVIAR.test(`${i.producto.producto} ${i.producto.presentacion}`)))
    .map((c) => {
      const foto = c.fotoUrl!.startsWith("/") ? `${base}${c.fotoUrl}` : c.fotoUrl!;
      const peso = medida(pesoCombo(c.items), "g");
      const titulo = `Combo ${c.nombre}${peso && !/kilo|kg/i.test(c.nombre) ? ` ${peso}` : ""}`.slice(0, 150);
      return `<item><g:id>${x(`combo-${c.slug}`)}</g:id><g:title>${x(titulo)}</g:title><g:description>${x(seoCombo(c, cfg.compraMinimaPropia).description)}</g:description><g:link>${base}/combos/${encodeURIComponent(c.slug)}</g:link><g:image_link>${x(foto)}</g:image_link><g:price>${c.precio.toFixed(2)} ARS</g:price><g:availability>in_stock</g:availability><g:condition>new</g:condition><g:brand>${x(SITIO.nombre)}</g:brand><g:product_type>Combos</g:product_type><g:is_bundle>yes</g:is_bundle><g:identifier_exists>no</g:identifier_exists></item>`;
    });
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${x(SITIO.nombre)}</title><link>${base}</link><description>${x(SITIO.descripcion)}</description>${items.join("")}${combos.join("")}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
