// Datos estructurados de la ficha de producto (Product para fichas de comerciante de Google).
// Google pide `image` rastreable (en sus ejemplos, siempre URL completa) y recomienda fuerte `description`:
// https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
// La descripción sale de lo que la ficha ya muestra: no se agregan propiedades ni promesas.

export function urlAbsoluta(base: string, src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  return `${base.replace(/\/$/, "")}/${src.replace(/^\/+/, "")}`;
}

export function imagenesLd(base: string, fotos: string[], fotoUrl?: string | null): string[] | undefined {
  const lista = fotos.length ? fotos : fotoUrl ? [fotoUrl] : [];
  return lista.length ? lista.map((f) => urlAbsoluta(base, f)) : undefined;
}

export function descripcionLd(titulo: string, categoria: string, porQue?: string | null): string {
  const texto = porQue?.replace(/\s+/g, " ").trim();
  if (texto) return texto.length > 5000 ? `${texto.slice(0, 4997)}...` : texto;
  return `${titulo}, en ${categoria.toLowerCase()}. Entrega a domicilio en Villa Carlos Paz y el sur de Punilla, y envíos a todo el país.`;
}
