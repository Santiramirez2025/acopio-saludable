import { fotoRealProducto } from "./galeria";

/**
 * Foto para el feed de Google Merchant Center (fichas gratuitas de Shopping), 18/11 (Mateo, SEO).
 *
 * Google rechaza imágenes que no muestran el producto físico (ilustraciones, íconos, tarjetas) y las que
 * llevan textos, logos o nombres de tienda superpuestos («Image link [image_link]», Merchant Center Help).
 * Las «tarjetas de la casa» (public/img/productos/encargo y /prov: dibujo + nombre + «Por encargo») son eso,
 * así que no se mandan. Si hay foto real de la mesa de fraccionado, va esa, recortada sin el sello
 * «Foto real · Acopio Saludable» (public/img/reales/feed). Las bolsas cerradas de 5 y 10 kg no usan la foto
 * de la bolsa fraccionada de 1 kg: no es lo que se vende.
 *
 * 20/11 (Mateo): las fotos de Openverse (catalogo/fotos-reales, «fotos ilustrativas» de otros autores: almíbar de
 * panqueques para el arrope, sopa de restaurante para el caldo, cápsulas genéricas) tampoco van. Muestran algo
 * parecido, no el producto que vendemos, y Merchant Center pide la imagen del producto vendido; además las CC BY
 * exigen crédito, que en Shopping no se puede dar. Si el producto tiene otra foto propia o del proveedor en
 * `fotos`, va esa; si no, el producto queda fuera del feed (no de la tienda).
 */
const OPENVERSE = /\/productos\/openverse-/;
const TARJETA = /\/img\/productos\/(encargo|prov)\//;
const BOLSA_CERRADA = /-(\d+)KG$/i;

const sirve = (u: string | null | undefined): u is string => !!u && !TARJETA.test(u) && !OPENVERSE.test(u);

export function fotoFeed(codigo: string, fotoUrl: string | null, fotos: string[] = []): string | null {
  const real = BOLSA_CERRADA.test(codigo) && !/-1KG$/i.test(codigo) ? null : fotoRealProducto(codigo);
  if (real) return real.replace("/img/reales/", "/img/reales/feed/");
  if (sirve(fotoUrl)) return fotoUrl;
  return fotos.find(sirve) ?? null;
}
