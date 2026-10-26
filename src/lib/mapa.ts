// Links a Google Maps para el reparto: tocás y abre la navegación lista hasta la casa del cliente.

/** «Virgen de Lourdes 4480», «Cordoba», «Córdoba» → «Virgen de Lourdes 4480, Cordoba, Córdoba, Argentina» (sin repetir). */
export function direccionCompleta(calle: string | null | undefined, ciudad?: string | null, provincia?: string | null): string {
  const partes: string[] = [];
  for (const p of [calle, ciudad, provincia || "Córdoba", "Argentina"]) {
    const t = String(p ?? "").trim();
    if (!t || /la lleva|retira|a confirmar/i.test(t)) continue;
    if (partes.some((x) => x.toLowerCase().includes(t.toLowerCase()))) continue;
    partes.push(t);
  }
  return partes.join(", ");
}

/** Navegación desde donde estás hasta esa dirección. Null si no hay calle. */
export function linkMapa(calle: string | null | undefined, ciudad?: string | null, provincia?: string | null): string | null {
  if (!String(calle ?? "").trim() || /^(a confirmar|-|retira)/i.test(String(calle).trim())) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccionCompleta(calle, ciudad, provincia))}&travelmode=driving`;
}

/** La ruta del reparto con varias paradas (Google Maps acepta hasta 9 intermedias). */
export function linkRuta(direcciones: string[]): string | null {
  const ds = direcciones.filter(Boolean).slice(0, 10);
  if (!ds.length) return null;
  const destino = ds[ds.length - 1];
  const paradas = ds.slice(0, -1);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}${paradas.length ? `&waypoints=${encodeURIComponent(paradas.join("|"))}` : ""}&travelmode=driving`;
}
