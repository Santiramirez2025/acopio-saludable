// Lo que nos piden y no vendemos. Desde el 7/11 el vendedor dice derecho «semillas de zapallo no
// tengo» y pregunta para qué lo buscaban: esa frase es el dato. Acá se junta, por producto, cuántas
// charlas distintas lo pidieron, para la lista semanal (qué publicar primero si La Granja o Harinar
// ya lo trabajan). Es una lectura de texto: cuenta lo que el vendedor o una persona dijo que no hay.

export type NoTenemos = { producto: string; veces: number; ejemplo: string };
type Mensaje = { de: string; texto: string };

const VERBO = String.raw`(?:tengo|tenemos|trabajamos|manejamos|vendemos|hay|nos qued(?:a|an|ó|aron))`;
// Lo que sigue a «no tenemos …» y no es un producto: condiciones, local, envío, datos.
const NO_ES_PRODUCTO = /^(?:as[ií] que|pero|hoy|ahora|ac[aá]|aqu[ií]|entiendo|entendido|dale|nosotros|confirmad\w*|alojamiento|esquina|retiro|local|direcci[oó]n|d[oó]nde|capaz|publicad\w*|sin local|sueltos?|te aviso|todo|compra|m[ií]nim|problema|drama|apuro|cargo|costo|recargo|env[ií]o|reparto|stock|ese dato|el dato|datos?|forma|manera|c[oó]mo|que |qu[eé] |nada|ning[uú]n|algo|tiempo|horario|turno|lugar|sucursal|precio|promo|descuento|un |una |uno |el |la |los |las |eso|esto|esa|ese|para |en |de |con |por |s[ií] |m[aá]s |otr[oa])/;
const CORTE = /\s+(?:perd[oó]n|por ahora|hoy|en este momento|ahora|todav[ií]a|lamentablemente|disculp\w*)\b.*$/i;

function limpiar(s: string): string | null {
  const p = s.toLowerCase().replace(CORTE, "").replace(/[^a-záéíóúñü\s]/g, " ").replace(/\s+/g, " ").trim();
  if (p.length < 3 || p.length > 40 || NO_ES_PRODUCTO.test(p + " ")) return null;
  return p.replace(/\bnueces\b/g, "nuez").replace(/\bsemilla\b/g, "semillas");
}

function partes(s: string): string[] {
  const base = s.toLowerCase().replace(/^(?:de |del )/, "").replace(/\s+(?:en el cat[aá]logo|sueltas?|sueltos?|por kilo|x kilo|en este momento)\b.*$/, "");
  return base.split(/\s+ni\s+/).map(limpiar).filter((x): x is string => Boolean(x));
}

/** Productos que el vendedor (o una persona) dijo que no hay en un mensaje. */
export function productosQueNoHay(texto: string): string[] {
  const t = texto.replace(/\s+/g, " ");
  const salida = new Set<string>();
  // «Hoy no tenemos semillas de zapallo, perdón.» / «No trabajamos nuez de Brasil.»
  for (const m of t.matchAll(new RegExp(String.raw`\bno ${VERBO} ([a-záéíóúñü][a-záéíóúñü ]{2,45}?)(?=[,.!?;:¿]|$| (?:pero|y te|así|asi)\b)`, "gi"))) {
    for (const p of partes(m[1])) salida.add(p);
  }
  // «Semillas de zapallo no tengo.» (el producto va primero, al arrancar la frase)
  for (const m of t.matchAll(new RegExp(String.raw`(?:^|[.!?¡¿;]\s*)([a-záéíóúñü][a-záéíóúñü ]{2,45}?) no ${VERBO}\b`, "gi"))) {
    for (const p of partes(m[1].replace(/^(?:hola\s+\w+|hoy|y|pero|lamentablemente|uh|ay)\s+/i, ""))) salida.add(p);
  }
  return [...salida];
}

/** Cuenta por producto las charlas distintas donde se dijo que no hay, con la pregunta del cliente de ejemplo. */
export function contarNoTenemos(charlas: Mensaje[][]): NoTenemos[] {
  const cuenta = new Map<string, NoTenemos>();
  for (const mensajes of charlas) {
    const vistos = new Set<string>();
    let ultimaDelCliente = "";
    for (const m of mensajes) {
      if (m.de === "cliente") { ultimaDelCliente = m.texto; continue; }
      for (const p of productosQueNoHay(m.texto)) {
        if (vistos.has(p)) continue;
        vistos.add(p);
        const fila = cuenta.get(p) ?? { producto: p, veces: 0, ejemplo: ultimaDelCliente.replace(/\s+/g, " ").slice(0, 120) };
        fila.veces++;
        cuenta.set(p, fila);
      }
    }
  }
  return [...cuenta.values()].sort((a, b) => b.veces - a.veces || a.producto.localeCompare(b.producto));
}
