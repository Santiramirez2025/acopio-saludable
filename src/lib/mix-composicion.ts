// Qué trae un mix, para que el vendedor conteste con los ingredientes y no con el precio.
// De los 23 reactivados que siguieron tras «Sí, pasame precios», el motivo más común fue el producto (n=10),
// y a «qué tiene el mix» el bot contestó «es un kilo y sale $19.300» (Nico, 5/11). Sale de la misma ficha que se ve en la web.

const TOPE = 160;

export function queTraeMix(producto: string, texto: string | null | undefined): string | null {
  if (!/\bmix\b/i.test(producto)) return null;
  const limpio = (texto ?? "").replace(/\s+/g, " ").trim();
  if (!limpio) return null;
  return limpio.length > TOPE ? `${limpio.slice(0, TOPE).trimEnd()}…` : limpio;
}
