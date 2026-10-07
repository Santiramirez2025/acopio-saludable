// Fotos de producto: salen del backend del proveedor (campo "photos" de cada artículo)
// y están alojadas en un bucket público. Guardamos la URL final en la base.

export const BASE_FOTOS = "https://s3-sa-east-1.amazonaws.com/buho-images/multiclient/upload/photos-articles/";

/** "article_123_01.02.2024;article_123_b" -> URLs completas. */
export function urlsDesdeCampoPhotos(photos: string | null | undefined): string[] {
  if (!photos) return [];
  return photos
    .split(/[;,|]/)
    .map((p) => p.trim())
    .filter((p) => /^[\w.\-]+$/.test(p))
    .map((p) => BASE_FOTOS + p);
}

export type FilaFoto = { sku: string; photos?: string | null };

export function leerJsonFotos(texto: string): FilaFoto[] {
  const data = JSON.parse(texto);
  const filas = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : null;
  if (!filas) throw new Error("El JSON de fotos debe ser una lista de { sku, photos }");
  return filas
    .filter((f: unknown): f is FilaFoto => !!f && typeof (f as FilaFoto).sku === "string")
    .map((f: FilaFoto) => ({ sku: f.sku, photos: f.photos ?? null }));
}
