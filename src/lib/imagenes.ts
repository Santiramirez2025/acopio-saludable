// Reglas de nombres para la carga masiva de imágenes (sin dependencias).

/** "3622-1.png", "3622_hero.jpg" o "3622.webp" → código 3622. El código es texto: "00000010-2.png" → 00000010. */
export function codigoDesdeArchivo(nombre: string, codigos: Set<string>): string | null {
  const base = nombre.replace(/\.(png|jpe?g|webp)$/i, "");
  if (codigos.has(base)) return base;
  const m = base.match(/^(.+?)[-_ .]/);
  return m && codigos.has(m[1]) ? m[1] : null;
}

