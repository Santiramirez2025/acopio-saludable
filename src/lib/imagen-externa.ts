// Imágenes bajadas de sitios de terceros (Openverse y los hosts a los que apunta: Flickr, Wikimedia…) antes de
// pasarlas por sharp/libvips. Son datos no confiables: sharp arrastra fallas en los decodificadores de libvips y
// libheif (CVE-2026-33327/33328/35590/35591, GHSA-g89c-p67h-r497). Solo dejamos entrar los formatos de foto comunes,
// reconocidos por sus primeros bytes (no por la extensión ni el content-type, que manda el servidor ajeno), y con un
// tope de píxeles para que una imagen gigante no agote la función.

export type FormatoFoto = "jpeg" | "png" | "webp";

/** Tope de píxeles de entrada para sharp (≈ 8000 × 5000). El default de sharp es 268 millones. */
export const MAX_PIXELES_EXTERNOS = 40_000_000;

/** Formato real por los bytes del encabezado; null si no es JPEG, PNG ni WebP (HEIF, AVIF, TIFF, SVG, GIF, HTML…). */
export function formatoFotoSeguro(b: Uint8Array): FormatoFoto | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "png";
  const ascii = (i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "webp";
  return null;
}

/** Opciones de entrada para sharp con imágenes de afuera. */
export const OPCIONES_SHARP_EXTERNA = { limitInputPixels: MAX_PIXELES_EXTERNOS, failOn: "error" as const };
