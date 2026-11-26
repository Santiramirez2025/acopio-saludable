// El pedido que se arma charlando: lo nuevo se suma a lo guardado y la zona ya dicha se reutiliza. Puro.
import { hablaDeFueraDeZona, zonaDeLugar } from "./envio-zona";
/** Suma lo nuevo a lo guardado: la misma cosa pisa la cantidad, el resto queda. */
export function sumarLineas(previas: { tipo: "producto" | "combo"; id: string; cantidad: number }[], nuevas: { tipo: "producto" | "combo"; id: string; cantidad: number }[]) {
  const out = previas.map((l) => ({ ...l }));
  for (const n of nuevas) {
    const i = out.findIndex((l) => l.tipo === n.tipo && l.id === n.id);
    if (i >= 0) out[i] = { ...out[i], cantidad: n.cantidad };
    else out.push({ ...n });
  }
  return out;
}

/** De dónde es, si ya lo dijo: el botón de zona, o el «Envío a X:» del vendedor. null si no se sabe. */
export function lugarDelHistorial(historial: { de: "yo" | "acopio"; texto: string }[]): string | null {
  for (const h of [...historial].reverse()) {
    if (h.de === "acopio") {
      const m = h.texto.match(/Envío a ([^:]+):/);
      if (m) return m[1].trim();
      continue;
    }
    const t = h.texto.trim();
    if (/^(carlos paz( y zona)?|villa carlos paz|c[oó]rdoba capital)$/i.test(t)) return t.replace(/ y zona$/i, "");
  }
  return null;
}

/**
 * 16/11 (seguridad): el cliente nombró en la charla un lugar fuera de la zona propia (Córdoba Capital, Malagueño,
 * otra provincia o «por correo»). Desde el 15/11 una dirección o un «los espero» cierran un pedido Cobrar al entregar,
 * y una dirección como «Av. Colón 1234, Córdoba» no la detecta lugarDelHistorial (solo mira el botón y «Envío a X:»).
 * Si el mismo mensaje nombra un lugar de la zona propia, vale ese. Puro.
 */
/**
 * 26/11 (Myriam: «La Antartida 598 esq San Luis»; Su: «entre San Luis y Mendoza»): en Carlos Paz muchas calles se llaman
 * como provincias o ciudades. «esq. San Luis», «entre X y Y», «calle Mendoza» o «Córdoba 450» son calles, no lugares:
 * se sacan antes de buscar si nombra algo fuera de la zona. «Av. Colón 1234, Córdoba» sigue diciendo Córdoba.
 */
export function sinCallesConNombreDeLugar(t: string): string {
  return t
    .replace(/\b(entre)\s+[a-záéíóúñ.]+(?:\s+[a-záéíóúñ.]+){0,2}\s+y\s+[a-záéíóúñ.]+(?:\s+[a-záéíóúñ.]+){0,2}/gi, " ")
    .replace(/\b(esq\.?|esquina|calle|av\.?|avda\.?|avenida|pasaje|pje\.?|bv\.?|bulevar|boulevard)\s+[a-záéíóúñ.]+(?:\s+(?!y\b)[a-záéíóúñ.]+){0,2}/gi, " ")
    .replace(/\b[a-záéíóúñ]{3,}(?:\s+[a-záéíóúñ]{3,})?\s+\d{1,5}\b/gi, " ");
}

export function clienteNombraFueraDeZona(historial: { de: "yo" | "acopio"; texto: string }[], textoActual = ""): boolean {
  const delCliente = [...historial.filter((h) => h.de === "yo").map((h) => h.texto), textoActual].filter(Boolean).map(sinCallesConNombreDeLugar);
  return delCliente.some((t) => {
    const z = zonaDeLugar(t, null);
    return z ? z.tipo !== "propia" : hablaDeFueraDeZona(t);
  });
}

/**
 * 22/11 (Liliana, Bialet Massé, AS-152): el bot le cotizó «Envío: $ 3.000 · Total con envío $27.000», ella dijo
 * «al recibirlo pago efectivo» y el pedido salió «$24.000 con envío sin cargo», porque el cierre al recibir tomaba
 * «Villa Carlos Paz» por defecto. Lo último que le cotizamos de envío en la charla (null si nunca se dijo).
 */
export function envioCotizadoEnCharla(historial: { de: "yo" | "acopio"; texto: string }[]): number | null {
  for (const h of [...historial].reverse().filter((x) => x.de === "acopio").slice(0, 8)) {
    const m = h.texto.match(/\benv[ií]o(?: a [^:\n(]{2,40})?:? \(?\$ ?(\d{1,3}(?:\.\d{3})+|\d{3,6})\)?/i);
    if (m) return Number(m[1].replace(/\./g, ""));
    if (/env[ií]o sin cargo|va sin cargo|sin costo de env[ií]o/i.test(h.texto)) return 0;
  }
  return null;
}

/**
 * ¿Pide cambiar lo que lleva un pedido ya tomado? «Te confirmo 2 tríos», «sumame un kilo de nuez», «agregá la miel»,
 * «en vez de pasas, avena». Una pregunta («¿si te pido 2 el envío es gratis?») no es un cambio.
 */
export function pideCambioDePedido(texto: string): boolean {
  const t = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (t.includes("?") || /\bsi te pido\b/.test(t)) return false;
  return /\b(\d|dos|tres|cuatro|otro|otra|uno mas|una mas)\b.{0,25}\b(trios?|combos?|kilos?|kg|bolsas?|paquetes?|alacenas?|despensas?|kits?)\b|\b(sumame|agregame|agrega|suma|poneme|quiero tambien|tambien quiero|en vez de|cambiame|sacame|saca (el|la|los|las)|mejor que sean)\b/.test(t);
}
