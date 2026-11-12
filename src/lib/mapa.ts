// Links a Google Maps para el reparto: tocás y abre la navegación lista hasta la casa del cliente.
//
// El problema que esto resuelve (Santiago, 6/11): el cliente escribe la dirección a mano y mete
// aclaraciones («Belgrano 123, al lado del kiosco, timbre 2», «entre Alberdi y Sarmiento»,
// «Golf Club (lo pidió el cliente)»). Google interpreta todo ese texto y manda a cualquier lado.
// Tres defensas, en orden:
//   1. Si el pedido tiene UBICACIÓN guardada (lat,lng), el link va a las coordenadas: no hay nada que interpretar.
//   2. Si no, se limpia la dirección (se tiran paréntesis, aclaraciones, timbres, pisos) y se le suma el
//      código postal, que es lo que fija la localidad.
//   3. Si no queda una calle con altura, NO se arma el link: mejor sin botón que un botón que lleva mal.

const sin = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** «-31.4201,-64.4932» o un link de Google Maps con coordenadas → «-31.4201,-64.4932». Null si no hay. */
export function leerCoordenadas(texto: string | null | undefined): string | null {
  const t = String(texto ?? "");
  if (!t.trim()) return null;
  // Un par suelto, o el @lat,lng,zoom y el !3dlat!4dlng que trae un link copiado de Google Maps.
  const m =
    t.match(/!3d(-?\d{1,3}\.\d{3,})!4d(-?\d{1,3}\.\d{3,})/) ??
    t.match(/[@=/](-?\d{1,2}\.\d{3,})[,%](-?\d{1,3}\.\d{3,})/) ??
    t.match(/(^|\s)(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})(\s|$)/);
  if (!m) return null;
  const nums = m.slice(1).filter((x) => x && /^-?\d/.test(x));
  const [lat, lng] = [Number(nums[0]), Number(nums[1])];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return `${lat},${lng}`;
}

/** Lo que el cliente escribió de más y a Google lo marea. */
const RUIDO =
  /\b(timbre|depto|dpto|departamento|piso|casa\s*n?º?\s*\d|monoblock|torre|manzana|mza|lote|entre|frente|al lado|a la vuelta|port[oó]n|reja|color|planta baja|p\.?b\.?|interno|cerca|pasando|contrafrente|fondo|dejar|tocar|llamar|avisar|wh?atsapp|cel|tel)\b/i;

/**
 * «Belgrano 123 (timbre 2), al lado del kiosco» → «Belgrano 123».
 * Deja la primera parte que tenga calle y altura, y tira todo lo demás.
 */
export function limpiarCalle(calle: string | null | undefined): string | null {
  let t = String(calle ?? "")
    .replace(/\([^)]*\)/g, " ") // paréntesis enteros
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ") // emojis
    .replace(/\b\d{6,}\b/g, " ") // teléfonos sueltos
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;
  // Se corta en la primera coma, guion o punto que arranque una aclaración.
  const trozos = t.split(/\s*[,;·—–-]\s*|\s+\|\s+/).map((x) => x.trim()).filter(Boolean);
  const conAltura = trozos.find((x) => /\d/.test(x) && !RUIDO.test(x));
  t = conAltura ?? trozos[0] ?? "";
  // Si igual quedó una aclaración pegada sin separador, se corta ahí.
  const m = t.match(RUIDO);
  if (m && m.index !== undefined && m.index > 0) t = t.slice(0, m.index).trim();
  t = t.replace(/[\s,.;:-]+$/, "").trim();
  if (!t || t.length < 4) return null;
  if (!/\d/.test(t)) return null; // sin altura no se navega: una calle entera mide 40 cuadras
  if (/^(a confirmar|retira|retiro|la lleva|sin direccion|s\/d|-+)$/i.test(sin(t))) return null;
  return t;
}

/** Localidades donde una dirección NO es de Carlos Paz aunque falte la ciudad. */
const OTRA_LOCALIDAD = /\b(cordoba capital|ciudad de cordoba|capital|tanti|cosquin|la falda|bialet masse|santa maria|icho cruz|cuesta blanca|mayu sumaj|san antonio|tala huasi|villa del lago|san roque|santa cruz del lago|malagueno|la calera|villa allende|mendiolaza|rio ceballos|alta gracia|villa maria)\b/;

/** «Belgrano 123», «Villa Carlos Paz», «Córdoba», «5152» → «Belgrano 123, Villa Carlos Paz, Córdoba 5152, Argentina». */
export function direccionCompleta(
  calle: string | null | undefined,
  ciudad?: string | null,
  provincia?: string | null,
  cp?: string | null,
): string {
  const partes: string[] = [];
  // 12/11: sin ciudad («A confirmar»), Google mandaba «Capitán Bustos 1530, Santa Rita» a Córdoba capital (Olga).
  // Casi todo lo que repartimos es de Carlos Paz: sin ciudad y sin otra localidad en la calle, va Villa Carlos Paz.
  const sinCiudad = !String(ciudad ?? "").trim() || /a confirmar|la lleva|retira/i.test(String(ciudad));
  const otra = sin(String(calle ?? "")).match(OTRA_LOCALIDAD)?.[1];
  const ciudadReal = !sinCiudad ? ciudad : otra ? otra.replace(/\b\w/g, (l) => l.toUpperCase()) : "Villa Carlos Paz";
  for (const p of [limpiarCalle(calle) ?? calle, ciudadReal, provincia || "Córdoba"]) {
    const t = String(p ?? "").trim();
    if (!t || /la lleva|retira|a confirmar/i.test(t)) continue;
    if (partes.some((x) => sin(x).includes(sin(t)))) continue;
    partes.push(t);
  }
  const postal = String(cp ?? "").trim();
  if (postal && /\d/.test(postal)) partes.push(postal);
  partes.push("Argentina");
  return partes.join(", ");
}

/**
 * Navegación desde donde estás hasta el cliente.
 * `ubicacion` es el «lat,lng» guardado en el pedido (o un link de Google Maps pegado): si está, manda él.
 * Null si no hay forma de llegar sin adivinar.
 */
export function linkMapa(
  calle: string | null | undefined,
  ciudad?: string | null,
  provincia?: string | null,
  cp?: string | null,
  ubicacion?: string | null,
): string | null {
  const coord = leerCoordenadas(ubicacion);
  if (coord) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coord)}&travelmode=driving`;
  if (!limpiarCalle(calle)) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccionCompleta(calle, ciudad, provincia, cp))}&travelmode=driving`;
}

/** Ver el punto en el mapa antes de salir, para confirmar que es ahí. */
export function linkVerEnMapa(
  calle: string | null | undefined,
  ciudad?: string | null,
  provincia?: string | null,
  cp?: string | null,
  ubicacion?: string | null,
): string | null {
  const coord = leerCoordenadas(ubicacion);
  if (coord) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coord)}`;
  if (!limpiarCalle(calle)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionCompleta(calle, ciudad, provincia, cp))}`;
}

/** La ruta del reparto con varias paradas (Google Maps acepta hasta 9 intermedias). */
export function linkRuta(direcciones: string[]): string | null {
  const ds = direcciones.filter(Boolean).slice(0, 10);
  if (!ds.length) return null;
  const destino = ds[ds.length - 1];
  const paradas = ds.slice(0, -1);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}${paradas.length ? `&waypoints=${encodeURIComponent(paradas.join("|"))}` : ""}&travelmode=driving`;
}
