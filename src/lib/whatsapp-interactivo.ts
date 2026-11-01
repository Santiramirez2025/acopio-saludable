// Mensajes interactivos de WhatsApp: botones, listas y botón con link.
//
// Puro a propósito (sin base ni red): arma lo que se manda y se prueba sin gastar nada.
//
// Por qué botones y no links: la gente desconfía de un link suelto que le manda un número
// que no conoce, y escribir cansa. Un botón se toca, se ve oficial y la charla avanza sola.
// El link aparece recién cuando la persona eligió pagar, y va dentro de un botón «Pagar».

import { PAGO_AL_RECIBIR } from "./politica";
import { pesos } from "./precios";
import type { EnvioCotizado, Ficha, Respuesta } from "./asistente-catalogo";

export type Boton = { id: string; titulo: string };
export type Fila = { id: string; titulo: string; descripcion?: string };

export type Saliente =
  | { tipo: "texto"; texto: string }
  | { tipo: "imagen"; url: string; pie?: string }
  | { tipo: "video"; url: string; pie?: string }
  | { tipo: "botones"; cuerpo: string; botones: Boton[]; pie?: string }
  | { tipo: "lista"; cuerpo: string; boton: string; secciones: { titulo: string; filas: Fila[] }[] }
  | { tipo: "cta"; cuerpo: string; texto: string; url: string; pie?: string };

// Los topes de Meta. Pasarse de uno hace que rechace el mensaje entero.
const TOPE = { cuerpo: 1024, boton: 20, filaTitulo: 24, filaDesc: 72, id: 200, pie: 60, seccion: 24 };

export const corte = (t: string, n: number) => (t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`);

// Prefijos de los ids: cuando la persona toca, el webhook trae el id y de ahí se sabe qué hacer.
export const ID = {
  quiero: "quiero|", // quiero|p|<codigo> o quiero|c|<slug>
  pagar: "pagar|", // pagar|<camino del carrito>
  transferencia: "transf|", // transf|<camino>~<costo envío>~<lugar>
  recibir: "recibir|", // recibir|<camino>~<costo envío>~<lugar>: paga cuando le llega (entrega propia)
  opcion: "op|", // op|<texto>: se atiende como si lo hubiera escrito
  trae: "trae|", // trae|<slug>: qué trae el combo, sin pasar por el modelo
  zona: "zona|", // zona|<lugar>: dónde vive, para cotizar el envío del pedido guardado
} as const;

/** De qué es una ficha, leyendo su link: producto o combo, y su código o slug. */
export function claseDeFicha(f: Ficha): { clase: "p" | "c"; id: string } | null {
  const m = f.href.match(/^\/(producto|combos)\/([^/?#]+)/);
  if (!m) return null;
  return { clase: m[1] === "combos" ? "c" : "p", id: decodeURIComponent(m[2]) };
}

/** Qué tocó la persona, a partir del id del botón o de la fila. */
export type Toque =
  | { tipo: "quiero"; clase: "producto" | "combo"; id: string }
  | { tipo: "pagar"; camino: string }
  | { tipo: "transferencia"; camino: string; envio: { costo: number | null; lugar: string } | null }
  | { tipo: "recibir"; camino: string; envio: { costo: number | null; lugar: string } | null }
  | { tipo: "opcion" }
  | { tipo: "trae"; slug: string }
  | { tipo: "zona"; lugar: string }
  | null;

export function leerToque(id: string | null | undefined): Toque {
  if (!id) return null;
  if (id.startsWith(ID.quiero)) {
    const [, c, ...resto] = id.split("|");
    const codigo = resto.join("|");
    if (!codigo || (c !== "p" && c !== "c")) return null;
    return { tipo: "quiero", clase: c === "c" ? "combo" : "producto", id: codigo };
  }
  if (id.startsWith(ID.pagar)) return { tipo: "pagar", camino: id.slice(ID.pagar.length) };
  if (id.startsWith(ID.transferencia)) return { tipo: "transferencia", ...conEnvio(id.slice(ID.transferencia.length)) };
  if (id.startsWith(ID.recibir)) return { tipo: "recibir", ...conEnvio(id.slice(ID.recibir.length)) };
  if (id.startsWith(ID.opcion)) return { tipo: "opcion" };
  if (id.startsWith(ID.zona)) return id.length > ID.zona.length ? { tipo: "zona", lugar: id.slice(ID.zona.length) } : null;
  if (id.startsWith(ID.trae)) return id.length > ID.trae.length ? { tipo: "trae", slug: id.slice(ID.trae.length) } : null;
  return null;
}

/** «/carrito?p=c-x*1~0~Carlos Paz» → camino y envío. Sin «~» (botones viejos), sin envío. */
export function conEnvio(resto: string): { camino: string; envio: { costo: number | null; lugar: string } | null } {
  const [camino, costo, ...lugar] = resto.split("~");
  if (costo === undefined) return { camino, envio: null };
  const n = Number(costo);
  return { camino, envio: { costo: costo === "" || !Number.isFinite(n) ? null : n, lugar: lugar.join("~") } };
}

const botonesDeOpciones = (opciones: string[]): Boton[] =>
  opciones.slice(0, 3).map((o) => ({ id: corte(`${ID.opcion}${o}`, TOPE.id), titulo: corte(o, TOPE.boton) }));

/** El pedido armado: qué lleva, cuánto suma y cómo quiere pagar. */
export type PedidoArmado = {
  camino: string;
  renglones: string[];
  total: string;
  conTransferencia: string | null;
  falta: string | null;
  /** Envío ya cotizado para su zona. Sin esto todavía no se muestran los botones de pago. */
  envio?: (EnvioCotizado & { totalConEnvio: string | null; transferenciaConEnvio: string | null }) | null;
};

/**
 * Traduce la respuesta del vendedor a lo que se manda por WhatsApp.
 *
 * - Pedido armado → resumen y tres botones: Mercado Pago, Transferencia, Sumar algo más.
 * - Productos o combos → la respuesta con una lista para tocar el que quiere (con precio), y
 *   la foto del combo antes si es uno solo.
 * - Solo opciones → la respuesta con hasta tres botones.
 * - Nada de eso → texto.
 */
export function planWhatsapp(r: Respuesta, pedido: PedidoArmado | null): Saliente[] {
  // Pidió fotos: van primero, cada una con nombre y precio al pie, y después el texto con sus botones.
  if (r.fotos?.length) {
    const fotos: Saliente[] = r.fotos.slice(0, 4).map((f) => ({ tipo: /\.mp4($|\?)/i.test(f.url) ? "video" : "imagen", url: f.url, pie: corte(f.pie, TOPE.cuerpo) }));
    return [...fotos, ...planWhatsapp({ ...r, fotos: undefined }, pedido)];
  }
  const texto = r.texto.trim();
  const aviso = r.aviso ? `\n\n${r.aviso}` : "";

  if (pedido) {
    const lineas = [texto, "", ...pedido.renglones.map((l) => `• ${l}`), `Total: ${pedido.total}`];
    if (pedido.conTransferencia) lineas.push(`Por transferencia: ${pedido.conTransferencia}`);
    if (pedido.falta) {
      lineas.push(`Te faltan ${pedido.falta} para la compra mínima.`);
      return [{ tipo: "botones", cuerpo: corte(lineas.join("\n"), TOPE.cuerpo), botones: botonesDeOpciones(["Sumar algo más", "Ver combos"]) }];
    }
    // Primero la zona: sin saber cuánto sale el envío, la gente no paga (pasó: dijeron «lo quiero» y se frenaron).
    if (!pedido.envio) {
      if (!/\?\s*$/.test(texto)) lineas.push("", "¿De qué barrio o ciudad sos? Así te digo el envío.");
      return [
        {
          tipo: "botones",
          cuerpo: corte(lineas.join("\n"), TOPE.cuerpo),
          botones: [
            { id: `${ID.zona}Carlos Paz`, titulo: "Carlos Paz y zona" },
            { id: `${ID.zona}Córdoba Capital`, titulo: "Córdoba Capital" },
            { id: `${ID.opcion}Otra ciudad`, titulo: "Otra ciudad" },
          ],
        },
      ];
    }
    // Con el envío ya cotizado, el «por transferencia» de arriba se reemplaza por el que lo incluye.
    const iTransf = lineas.findIndex((l) => l.startsWith("Por transferencia"));
    if (iTransf >= 0) lineas.splice(iTransf, 1);
    lineas.push(pedido.envio.costo === 0 ? `Envío: sin cargo` : pedido.envio.costo === null ? "Envío: se calcula con tu código postal" : `Envío: ${pesos(pedido.envio.costo)}`);
    if (pedido.envio.totalConEnvio) lineas.push(`Total con envío: ${pedido.envio.totalConEnvio}`);
    if (pedido.envio.transferenciaConEnvio) lineas.push(`Por transferencia: ${pedido.envio.transferenciaConEnvio}`);
    lineas.push("", "¿Cómo preferís pagar?");
    return [
      {
        tipo: "botones",
        cuerpo: corte(lineas.join("\n"), TOPE.cuerpo),
        pie: "Acopio Saludable · Villa Carlos Paz",
        botones: [
          { id: corte(`${ID.pagar}${pedido.camino}`, 256), titulo: "Mercado Pago" },
          { id: corte(`${ID.transferencia}${pedido.camino}~${pedido.envio.costo ?? ""}~${pedido.envio.lugar}`, 256), titulo: "Transferencia" },
          // Pagar al recibir solo en Carlos Paz y alrededores: en Córdoba capital hay zonas donde no conviene ir a cobrar.
          PAGO_AL_RECIBIR && pedido.envio.alRecibir
            ? { id: corte(`${ID.recibir}${pedido.camino}~${pedido.envio.costo ?? ""}~${pedido.envio.lugar}`, 256), titulo: "Pago al recibir" }
            : { id: `${ID.opcion}Sumar algo más`, titulo: "Sumar algo más" },
        ],
      },
    ];
  }

  // Los combos adelante: son la oferta principal aunque la última búsqueda haya sido un producto suelto.
  const fichas = (r.fichas ?? [])
    .map((f) => ({ f, c: claseDeFicha(f) }))
    .filter((x) => x.c)
    .sort((a, b) => Number(b.c!.clase === "c") - Number(a.c!.clase === "c"));
  if (fichas.length) {
    const salida: Saliente[] = [];
    // Combo primero: si lo que ofrece es un combo, va como tarjeta con foto y tres botones.
    // Es la oferta principal y tiene que cerrarse en un toque, no perderse en una lista.
    const primero = fichas[0];
    // Tarjeta solo si lo ofrecido son combos. Si mezcla combo y producto suelto, va la lista:
    // así «Lo quiero» nunca agrega algo distinto de lo que dice el texto.
    if (primero.c?.clase === "c" && fichas.length === 1) {
      if (primero.f.foto?.startsWith("http")) salida.push({ tipo: "imagen", url: primero.f.foto, pie: `${primero.f.nombre} · ${primero.f.precio}` });
      const tercera =
        (r.opciones ?? []).find((o) => !/quiero|trae|separ|agreg|dej|list|llev|compr|ped[ií]|^s[ií]\b|^s[ií]\W|dale/i.test(o)) ?? (fichas.length > 1 ? "Ver otro combo" : "Ver otros combos");
      salida.push({
        tipo: "botones",
        cuerpo: corte(texto + aviso, TOPE.cuerpo),
        botones: [
          { id: corte(`${ID.quiero}c|${primero.c.id}`, TOPE.id), titulo: "Lo quiero 🛒" },
          { id: corte(`${ID.trae}${primero.c.id}`, TOPE.id), titulo: "¿Qué trae?" },
          { id: corte(`${ID.opcion}${tercera}`, TOPE.id), titulo: corte(tercera, TOPE.boton) },
        ],
      });
      return salida;
    }
    // Varios productos: sin lista. La lista esconde los precios detrás de un botón y en los datos
    // fue lo que peor respondió (6 de 14 contestaron, contra 2 de cada 3 con texto o botones).
    // El texto ya nombra los precios; abajo van solo las respuestas a su pregunta.
  }

  // Botones solo cuando el mensaje termina en una pregunta: son las respuestas a esa pregunta.
  // Botones genéricos en cada mensaje («Ver combos», «Sumar algo más») son ruido y nadie los toca.
  if (r.opciones?.length && /\?\s*$/.test(texto)) {
    return [{ tipo: "botones", cuerpo: corte(texto + aviso, TOPE.cuerpo), botones: botonesDeOpciones(r.opciones) }];
  }
  return [{ tipo: "texto", texto: texto + aviso }];
}

/** Separa la línea OPCIONES del texto. Cada opción termina siendo un botón: máximo 3 y 20 caracteres. */
export function separarOpciones(crudo: string): { texto: string; opciones: string[] } {
  const lineas = crudo.split("\n");
  const i = lineas.findIndex((l) => /^\s*OPCIONES\s*:/i.test(l));
  if (i < 0) return { texto: crudo.trim(), opciones: [] };
  const opciones = lineas[i]
    .replace(/^\s*OPCIONES\s*:/i, "")
    .split("|")
    .map((o) => o.replace(/[«»"*]/g, "").trim())
    .filter((o) => o.length > 0 && o.length <= 20)
    .filter((o, k, a) => a.findIndex((x) => x.toLowerCase() === o.toLowerCase()) === k)
    .slice(0, 3);
  return { texto: lineas.filter((_, k) => k !== i).join("\n").trim(), opciones };
}

/**
 * Debajo del texto van los productos de los que habló, no los que trajo la última búsqueda.
 * Si nombró la Despensa, mostrar tres combos distintos confunde y no vende.
 */
export function fichasNombradas(fichas: Ficha[], texto: string): Ficha[] {
  const VACIAS = new Set(["de", "del", "la", "el", "los", "las", "con", "sin", "x", "y", "combo", "en"]);
  // Sin tildes, sin plural: «almendra» del texto tiene que encontrar «Almendras Non Pareil».
  const palabras = (t: string) =>
    t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9ñ\s]/g, " ").split(/\s+/)
      .filter((w) => w.length > 1 && !VACIAS.has(w))
      .map((w) => (w.length > 4 ? w.replace(/(es|s)$/, "") : w));
  const t = new Set(palabras(texto));
  const nombradas = fichas.filter((f) => {
    const clave = palabras(f.nombre.replace(/^Combo /, "").split(/[·(,]/)[0]).slice(0, 3);
    if (!clave.length) return false;
    const coinciden = clave.filter((w) => t.has(w)).length;
    return coinciden >= Math.min(2, clave.length);
  });
  if (nombradas.length) return nombradas;
  // No nombró ninguno: se muestra lo buscado solo si fue una búsqueda chica. Si juntó muchas
  // (varias herramientas), mostrar todo mezcla cosas que no ofreció, como un combo con TACC
  // a quien pidió sin TACC. Mejor sin lista: quedan los botones de respuesta.
  return fichas.length <= 4 ? fichas : [];
}

/** La presentación que trae el detalle de una ficha («Marca · x 1 kg» → «x 1 kg»). */
export function presentacionDe(f: Ficha): string {
  if (f.detalle.startsWith("Trae:")) return "";
  const partes = f.detalle.split(" · ").map((p) => p.trim()).filter(Boolean);
  return partes.at(-1) ?? "";
}

/** Pidió ver productos: no se pregunta nada, se muestran. Lista con los combos y atajos por tipo. */
export function quiereVer(texto: string): boolean {
  const t = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (t.length > 45) return false;
  return /^(quiero |me )?(ver|mostrame|mostrar|pasame|mandame)( (los|las|todos|todas|otros|otras|otro|otra|mas|el|la))* (productos?|combos?|opcion(es)?|catalogo|precios|lista)\b|^(que|cuales|que productos) (tienen|venden|hay|ofrecen)\b|^(catalogo|lista de precios|productos|combos|precios|ver mas)$/.test(t);
}

/**
 * «Lo veo tranquila y te escribo», «lo pienso», «después te aviso»: está pidiendo tiempo.
 * Ahí no se le arma el pedido ni se le ponen las zonas: se le da aire y se deja la puerta abierta.
 * Si en el mismo mensaje pregunta algo o acepta, no es postergar: se contesta normal.
 */
export function postergaCompra(texto: string): boolean {
  if (texto.includes("?")) return false;
  // Un número solo («3300») es un código postal, una cantidad o una hora, nunca un gracias.
  if (/\d/.test(texto)) return false;
  const t = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (t.length > 160) return false;
  if (/\b(lo quiero|la quiero|quiero (el|la|los|las|uno|una)|separamel|dejamel|agregal|anotal|mandamel|como (pago|hago)|pasame (el|los) (alias|cbu|link))\b/.test(t)) return false;
  return /\b(lo|la|los|las) (veo|miro|reviso|pienso|charlo|hablo|consulto)\b|\bveo tra?n?quil|\b(miro|reviso|veo) (con calma|tranquil|bien)|\b(lo|la) voy a (pensar|ver|mirar|consultar)|\bvoy a (pensar|ver|mirar)lo\b|\b(despues|luego|mas tarde|manana|en un rato|en otro momento|la semana que viene|cuando (cobre|pueda|vuelva))\b.*\b(te )?(escribo|aviso|confirmo|hablo|encargo|pido)|\bte (escribo|aviso|confirmo|hablo) (despues|luego|mas tarde|manana|en un rato|para encargar)|\bte escribo para (encargar|pedir)|\b(cualquier cosa|si me decido) te (escribo|aviso)|\b(pregunto|consulto|averiguo|veo|lo hablo|lo charlo) y te (digo|aviso|confirmo|escribo|cuento)/.test(t);
}

/**
 * «Más adelante», «No, gracias», «Por ahora no»: un no corto (casi siempre el botón del seguimiento).
 * Sin IA el bot le contestaba «En un rato te escribe Santiago con los precios» (Bety y Bibiana, 29/10):
 * una promesa que no pidió y una charla más en la cola de Santiago.
 */
export function noPorAhora(texto: string): boolean {
  const t = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!t || t.length > 40 || texto.includes("?")) return false;
  return /^(mas adelante|no gracias|no por ahora|por ahora no|x ahora no|ahora no|no ahora|no por el momento|por el momento no|en otro momento|otro dia|lo pienso)( gracias| muchas gracias)?$/.test(t);
}

/** Cierre amable para ese no, sin IA: sin precios, sin «te escribe Santiago». */
export const CIERRE_NO_POR_AHORA = "¡Dale, gracias por avisar! Cuando quieras nos escribís por acá 🙌";

/**
 * «Quiero precios de frutos secos por kilo» (el texto del anuncio) o «precio x kg»: pide la lista.
 * Sin IA (29/10) esa charla esperaba a una persona entre 6 y 33 minutos; la lista sale de la tienda.
 */
export function pidePreciosPorKilo(texto: string): boolean {
  const t = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  if (!t || t.length > 120) return false;
  if (!/\bprecios?\b|\bcuanto (sale|esta|cuesta|vale)n?\b|\blista\b/.test(t)) return false;
  return /\b(por|x|el|al) ?(kilo|kg)\b|\bkilos?\b|\bfrutos secos\b/.test(t);
}

/** Marca para no mandar la lista dos veces seguidas. */
export const MARCA_PRECIOS_POR_KILO = "Te paso precios por kilo de hoy";

/** Lo que piden los que escriben por el anuncio, en este orden (Nico, 29/10). */
const LISTA_POR_KILO: { etiqueta: string; si: RegExp; no?: RegExp }[] = [
  { etiqueta: "Mix clásico con cajú", si: /\bmix clasico con caju\b/, no: /girasol|sin mani|tropical/ },
  { etiqueta: "Mix con cajú y girasol", si: /\bmix clasico con caju y girasol\b/ },
  { etiqueta: "Nuez mariposa", si: /\bnuez mariposa\b/ },
  { etiqueta: "Castañas de cajú", si: /\bcasta(n|ñ)as de caju\b/, no: /pasas/ },
  { etiqueta: "Pasas de uva", si: /\bpasas de uva\b/, no: /rubia|chocolate/ },
  { etiqueta: "Dátiles", si: /\bdatiles\b/ },
];

const esUnKilo = (p: { producto: string; contenido: number | null; unidad: string | null }) => {
  const u = (p.unidad ?? "").toLowerCase();
  if (p.contenido) return (u === "kg" && p.contenido === 1) || (u === "g" && p.contenido === 1000);
  return /\bx ?1 ?(kg|kilo)s?\s*$/i.test(p.producto.trim());
};

/**
 * La respuesta fija, sin IA, con los precios vigentes de la tienda: los kilos sueltos que más piden y la
 * Despensa como la opción que más sale. Cobro antes del reparto (política del 28/10). null si falta la Despensa
 * o no se encontró ningún producto: en ese caso sigue el mensaje de espera.
 */
export function textoPreciosPorKilo(
  productos: { producto: string; precio: number; contenido: number | null; unidad: string | null }[],
  despensa: { precio: number; items: { producto: { producto: string } }[] } | null,
  descuentoTransferenciaPct: number,
  pesos: (n: number) => string,
  precioTransferencia: (precio: number, pct: number) => number | null,
): string | null {
  if (!despensa || !(despensa.precio > 0)) return null;
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const kilos = productos.filter((p) => esUnKilo(p) && p.precio > 0);
  const renglones: string[] = [];
  for (const l of LISTA_POR_KILO) {
    const p = kilos.find((k) => l.si.test(norm(k.producto)) && !(l.no && l.no.test(norm(k.producto))));
    if (p) renglones.push(`• ${l.etiqueta} ${pesos(p.precio)}`);
  }
  if (!renglones.length) return null;
  const transf = precioTransferencia(despensa.precio, descuentoTransferenciaPct);
  const trae = despensa.items.map((i) => i.producto.producto.replace(/\s+x\s+\d.*$/i, "").trim()).filter(Boolean);
  return [
    `¡Hola! ${MARCA_PRECIOS_POR_KILO}:`,
    ...renglones,
    "",
    `Lo que más sale es la Despensa de 4 kilos${trae.length ? ` (${trae.join(", ")})` : ""}: ${pesos(despensa.precio)}${transf ? `, ${pesos(transf)} por transferencia` : ""}.`,
    "En Carlos Paz y la zona te la llevamos sin cargo; se paga antes del reparto, por transferencia o Mercado Pago.",
    "¿De qué ciudad sos, así te digo el envío?",
  ].join("\n");
}

/**
 * EXPERIMENTO B (Martín, sáb 31/10, semana del 1 al 7/11): el primer mensaje de la charla que llega por un
 * anuncio con «Quiero precios de frutos secos por kilo» (el texto precargado) recibe lo que pidió: la lista
 * de los kilos que más piden, con los precios vigentes, y UNA pregunta que lleva al carrito (la zona, que
 * además define el mínimo y el envío sin cargo). Sin combo en el primer mensaje: el combo va después.
 * Antes (24-31/10): la IA daba 2 precios y «¿Para tu casa o para un negocio?»; 30% de las charlas de anuncio
 * no volvía a escribir y 11 tuvieron que pedir otra vez «Sí, pasame precios».
 */
export const OPCIONES_ZONA_PRIMERA_LISTA = ["Carlos Paz y zona", "Córdoba Capital", "Otra ciudad"];

export function esPrimerPedidoDePrecios(c: { texto: string; historial: { de: string }[]; deAnuncio: boolean; negocio: string }): boolean {
  if (!c.deAnuncio || c.negocio) return false;
  if (c.historial.some((h) => h.de === "acopio")) return false;
  return pidePreciosPorKilo(c.texto);
}

export function textoPrimeraListaPorKilo(
  productos: { producto: string; precio: number; contenido: number | null; unidad: string | null }[],
  nombre: string | null,
  pesos: (n: number) => string,
): string | null {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  const kilos = productos.filter((p) => esUnKilo(p) && p.precio > 0);
  const renglones: string[] = [];
  for (const l of LISTA_POR_KILO) {
    const p = kilos.find((k) => l.si.test(norm(k.producto)) && !(l.no && l.no.test(norm(k.producto))));
    if (p) renglones.push(`• ${l.etiqueta} ${pesos(p.precio)}`);
  }
  // Con menos de 3 precios no es «la lista»: sigue la IA.
  if (renglones.length < 3) return null;
  return [`¡Hola${nombre ? ` ${nombre}` : ""}! ${MARCA_PRECIOS_POR_KILO}:`, ...renglones, "", "Así te digo el envío: ¿de qué barrio o ciudad sos?"].join("\n");
}

const limpio = (texto: string) => texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

/**
 * «Pago aquí», «pago cuando me lo traés», «al recibir», «en efectivo cuando llegue»: está cerrando,
 * y pagar al recibir solo existe en la entrega propia. No hay que preguntarle la zona ni nada más.
 */
export function pagaAlRecibir(texto: string): boolean {
  const t = limpio(texto);
  if (t.includes("?")) return false;
  return /\b(pago|abono|te pago|lo pago|pagamos) (aqui|aca|ahi|al recibir|al recibirlo|contra ?entrega|en (mano|efectivo|casa)|cuando (llegue|lo reciba|me lo traigas|lo traigas|venga|vengas|me lo traes|lo traes))\b|\b(al recibir|contra ?entrega|contraentrega)\b|\bpago (en )?efectivo\b|^(efectivo|en efectivo|al recibir|pago al recibir)$/.test(t);
}

/**
 * «Pasame el alias», «por transferencia, mandame los datos», «Sí, mandámelos» (cuando le ofrecimos los datos):
 * ya eligió transferencia y quiere pagar. Se le mandan el total y los datos en el acto, como el botón
 * «Transferencia». 31/10: a Gabriel la IA le repreguntó dos veces y lo derivó; esperó 87 minutos el alias.
 * No cuenta si ya transfirió (eso es el comprobante) ni si pregunta si se puede transferir.
 */
export function pideDatosTransferencia(texto: string, ultimoNuestro = ""): boolean {
  const t = limpio(texto);
  if (/\b(ya )?(te )?(transferi|pague|deposite)\b|\btransferid[oa]\b|\bhice (la |una )?transferencia\b|\b(esta|ya esta) (hecha|hecho|pagado|transferido)\b|\b(mande|envie|pase|deposite) (la plata|el dinero|el pago|la transferencia|lo)\b|comprobante|se puede (pagar|transferir)|aceptan|puedo (pagar|transferir)|tenes mercado pago/.test(t)) return false;
  if (/\b(alias|cbu|cvu)\b/.test(t)) return true;
  if (/\b(pasame|pasa|mandame|manda|enviame|dame|pasan|mandan|necesito) (los |tus |sus )?datos( (para|de) (la )?(transferir|transferencia|pago|pagar))?\b/.test(t)) return true;
  if (/\b(quiero|prefiero|voy a|lo|te) (pagar |pago |hago )?(por |con |una )?transferencia\b/.test(t) && /\b(pasame|mandame|dame|datos|cuenta|ya)\b/.test(t)) return true;
  const ofrecimos = /datos (para|de) (transferir|la transferencia|pagar|pago)/.test(limpio(ultimoNuestro));
  return ofrecimos && /^(si|sii+|dale|ok|okey|bueno|por favor|si,? (mandamelos|pasamelos|dale|por favor|porfa)|mandamelos|pasamelos)[.! ]*$/.test(t);
}

/** ¿Pasó una dirección? Una calle con número, o «esquina», «barrio», «casa», «depto». */
export function tieneDireccion(texto: string): boolean {
  const t = limpio(texto);
  return /\b(direccion|calle|avenida|av\.|pasaje|esquina|barrio|b°|manzana|lote|depto|departamento|piso|casa (blanca|azul|verde|amarilla|roja|gris|de|con))\b/.test(t) || /\b(?!quiero|dame|mandame|sumame|agregame|son|sale|cuesta|precio|total|hasta|cada|minimo|compra)[a-z]{3,}(?: [a-z]{2,})? \d{1,5}\b(?! ?(kg|kilos?|k\b|gr|gramos|g\b|unid|unidades|u\b|pesos|\$|%|x\b|cajas?|bolsas?|paquetes?))/.test(t);
}

/** «Gracias», «ok, gracias», «👍» solos: se agradece corto y sin botones, sin volver a ofrecer. */
export function soloAgradece(texto: string): boolean {
  // «?» o «??» no es un gracias: está esperando la respuesta a algo que preguntó.
  if (texto.includes("?")) return false;
  // Un número solo («3300») es un código postal, una cantidad o una hora, nunca un gracias.
  if (/\d/.test(texto)) return false;
  const t = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  return /^((ok|oka|okey|dale|bueno|listo|genial|perfecto|joya|buenisimo|barbaro)\s)?(muchas\s)?(gracias|graciass+|grax|mil gracias)(\s(a vos|igualmente|che|genio|capo))?$/.test(t) || /^(ok|oka|okey|joya)$/.test(t) || t === "";
}

/** La respuesta a «lo veo tranquila»: cálida, corta, sin pedido ni zonas. Solo la tienda, por si quiere ir mirando. */
/** El nombre de pila, si el perfil de WhatsApp es de una persona. «casa playas de oro» o «Hotel X» no: «¡De nada, casa!» queda mal. */
export function primerNombre(nombre: string | null | undefined): string | null {
  const crudo = (nombre ?? "").trim();
  if (/@|gmail|hotmail|yahoo|outlook/i.test(crudo)) return null;
  const p = crudo.split(/\s+/)[0]?.replace(/[^\p{L}]/gu, "") ?? "";
  if (p.length < 2 || p.length > 20) return null;
  if (/^(casa|hotel|cabañas?|cabanas?|complejo|depto|departamentos?|apart|hostel|hosteria|hostería|posada|resort|spa|kiosco|almacen|almacén|dietetica|dietética|tienda|negocio|empresa|distribuidora|gym|gimnasio|lic|dr|dra|la|el|los|las|mi|mis|info|ventas|administracion|administración)$/i.test(p)) return null;
  return p[0].toUpperCase() + p.slice(1);
}

export function planDeNada(nombre: string | null): Saliente[] {
  const n = primerNombre(nombre);
  const quien = n ? `, ${n}` : "";
  return [{ tipo: "texto", texto: `¡De nada${quien}! Cualquier cosa nos escribís por acá 🙌` }];
}

export function planSinApuro(nombre: string | null, tienda: string, fotoReal?: string): Saliente[] {
  const n = primerNombre(nombre);
  const quien = n ? `, ${n}` : "";
  // «Lo pienso» es donde más se corta la venta. En vez de soltar, una foto real y una sola pregunta de cierre blando.
  const foto: Saliente[] = fotoReal ? [{ tipo: "imagen", url: fotoReal, pie: "Así llega tu pedido: en bolsa kraft, fraccionado y con una nota para vos" }] : [];
  return [
    ...foto,
    {
      tipo: "botones",
      cuerpo: `¡Dale${quien}! Sin apuro 🙌 Te lo dejo guardado. Cuando quieras, lo pagás por transferencia (te sale más barato) o Mercado Pago y en Carlos Paz y la zona te lo llevamos sin cargo en el próximo reparto.`,
      botones: [
        { id: `${ID.opcion}Sí, dejalo listo`, titulo: "Sí, dejalo listo" },
        { id: `${ID.opcion}Tengo una duda`, titulo: "Tengo una duda" },
        { id: `${ID.opcion}Más adelante`, titulo: "Más adelante" },
      ],
      pie: tienda.replace(/^https?:\/\//, ""),
    },
  ];
}

// «Ver combos»: primero los que vendemos (la Alacena es la oferta de entrada, la Mesa navideña es la de la temporada,
// la Despensa de 4 kilos es la del anuncio) y después el resto por precio. Ordenando solo por precio, con el tope de 6
// renglones y 3 botones, la Alacena ($45.000) y la Mesa navideña ($49.000) no aparecían nunca y los botones eran los
// tres más baratos (la Despensa chica ni llega a la compra mínima de Córdoba).
export const COMBOS_PRIMERO = ["alacena-de-frutos-secos", "mesa-navidena", "despensa-4-kilos"];
export function ordenarParaVer<T extends { slug: string; precio: number }>(combos: T[]): T[] {
  const rango = (slug: string) => {
    const i = COMBOS_PRIMERO.indexOf(slug);
    return i < 0 ? COMBOS_PRIMERO.length : i;
  };
  return [...combos].sort((a, b) => rango(a.slug) - rango(b.slug) || a.precio - b.precio);
}

export function planVer(combos: { slug: string; nombre: string; precio: string; argumento: string }[], _tienda?: string): Saliente[] {
  // Los combos a la vista, no escondidos en una lista: la lista se abría poco y la charla moría ahí.
  const renglones = combos.slice(0, 6).map((c) => `• ${c.nombre}: ${c.precio}`);
  const cuerpo = ["Estos son los combos del mes 👇", ...renglones, "", "¿Cuál te interesa? Tocalo y te cuento qué trae."].join("\n");
  return [
    {
      tipo: "botones",
      cuerpo: corte(cuerpo, TOPE.cuerpo),
      botones: combos.slice(0, 3).map((c) => ({ id: corte(`${ID.trae}${c.slug}`, TOPE.id), titulo: corte(c.nombre, TOPE.boton) })),
    },
  ];
}

/** «¿Qué trae?» de un combo: la lista completa y el botón para llevarlo. Fijo, sin modelo. */
export function planTrae(c: { slug: string; nombre: string; precio: string; argumento: string; renglones: string[] }): Saliente[] {
  const cuerpo = [`El combo ${c.nombre} trae:`, ...c.renglones.map((r) => `• ${r}`), "", `Todo por ${c.precio}${c.argumento ? ` (${c.argumento})` : ""} y ya llega a la compra mínima. ¿Lo querés así o te armamos uno a tu gusto?`].join("\n");
  return [
    {
      tipo: "botones",
      cuerpo: corte(cuerpo, TOPE.cuerpo),
      botones: [
        { id: corte(`${ID.quiero}c|${c.slug}`, TOPE.id), titulo: "Lo quiero 🛒" },
        { id: `${ID.opcion}Quiero armar mi propio combo`, titulo: "Armar el mío ✏️" },
        { id: `${ID.opcion}Ver otros combos`, titulo: "Ver otros combos" },
      ],
    },
  ];
}

/**
 * Un texto que parece cortado a mitad de palabra: corto y sin cierre (punto, signo o emoji)
 * en la parte que va antes de la línea de OPCIONES. Mejor pedirlo de nuevo que mandarlo así.
 */
export function cortada(crudo: string): boolean {
  const texto = separarOpciones(crudo).texto.trim();
  if (!texto) return false; // vacío se maneja aparte
  if (texto.length >= 40) return false;
  return !/[.!?…)\]"»\p{Extended_Pictographic}]$/u.test(texto);
}

/** El cuerpo que espera la API de Cloud para cada tipo. */
export function cuerpoGraph(s: Saliente, to: string): Record<string, unknown> {
  const base = { messaging_product: "whatsapp", recipient_type: "individual", to };
  switch (s.tipo) {
    case "texto":
      return { ...base, type: "text", text: { body: s.texto.slice(0, 4000), preview_url: false } };
    case "imagen":
      return { ...base, type: "image", image: { link: s.url, ...(s.pie ? { caption: corte(s.pie, 1024) } : {}) } };
    case "video":
      return { ...base, type: "video", video: { link: s.url, ...(s.pie ? { caption: corte(s.pie, 1024) } : {}) } };
    case "botones":
      return {
        ...base,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: s.cuerpo },
          ...(s.pie ? { footer: { text: corte(s.pie, TOPE.pie) } } : {}),
          action: { buttons: s.botones.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: corte(b.titulo, TOPE.boton) } })) },
        },
      };
    case "lista":
      return {
        ...base,
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: s.cuerpo },
          action: {
            button: corte(s.boton, TOPE.boton),
            sections: s.secciones.map((sec) => ({
              title: corte(sec.titulo, TOPE.seccion),
              rows: sec.filas.slice(0, 10).map((f) => ({ id: f.id, title: corte(f.titulo, TOPE.filaTitulo), ...(f.descripcion ? { description: corte(f.descripcion, TOPE.filaDesc) } : {}) })),
            })),
          },
        },
      };
    case "cta":
      return {
        ...base,
        type: "interactive",
        interactive: {
          type: "cta_url",
          body: { text: s.cuerpo },
          ...(s.pie ? { footer: { text: corte(s.pie, TOPE.pie) } } : {}),
          action: { name: "cta_url", parameters: { display_text: corte(s.texto, TOPE.boton), url: s.url } },
        },
      };
  }
}

/** Cómo queda en el panel: el texto y, entre corchetes, qué botones vio. */
export function textoParaPanel(s: Saliente): string {
  switch (s.tipo) {
    case "texto":
      return s.texto;
    case "imagen":
      return `[Foto] ${s.pie ?? ""}`.trim();
    case "video":
      return `[Video] ${s.pie ?? ""}`.trim();
    case "botones":
      return `${s.cuerpo}\n[Botones: ${s.botones.map((b) => b.titulo).join(" · ")}]`;
    case "lista":
      return `${s.cuerpo}\n[Lista: ${s.secciones.flatMap((x) => x.filas.map((f) => f.titulo + (f.descripcion ? ` (${f.descripcion.split(" · ")[0]})` : ""))).join(" · ")}]`;
    case "cta":
      return `${s.cuerpo}\n[Botón: ${s.texto}]`;
  }
}

/** Texto plano equivalente, por si Meta rechaza el interactivo (no se puede dejar a nadie sin respuesta). */
export function comoTexto(s: Saliente): string {
  switch (s.tipo) {
    case "texto":
      return s.texto;
    case "imagen":
    case "video":
      return s.pie ?? "";
    case "botones":
      return s.cuerpo;
    case "lista":
      return [s.cuerpo, ...s.secciones[0].filas.map((f) => `• ${f.titulo}${f.descripcion ? ` — ${f.descripcion.split(" · ")[0]}` : ""}`)].join("\n");
    case "cta":
      return `${s.cuerpo}\n${s.url}`;
  }
}

/**
 * La persona mandó una LISTA de productos («precio de: dátiles, cacao, harina de coco…» o uno por renglón).
 * Devuelve los productos si son 3 o más; si no, []. Con lista, el vendedor contesta cada uno y el total.
 */
export function listaDeProductos(texto: string): string[] {
  // Una foto, un audio o un comprobante descripto no es una lista de compras (a Mireya, 30/10, su comprobante
  // se leyó como «Al alias acopio.saludable — no lo tenemos»).
  // Ojo: al vendedor le llega con etiquetas delante (<cliente>, <anuncio>…), así que se mira sin ellas
  // (a Vanesa, 31/10, su audio transcripto se contestó «Hola — no lo tenemos… Total $0»).
  const sinEtiquetas = texto.replace(/<(\w+)>[\s\S]*?<\/\1>/g, "");
  if (/^\s*\[Mandó/.test(sinEtiquetas) || /\[Mandó (un audio|una foto|un archivo|el comprobante|un comprobante)/.test(texto)) return [];
  const limpio = sinEtiquetas
    .replace(/^[\s\S]*?(precios?|cu[aá]nto sale[n]?|cotiz[aá]me|necesito|quiero|busco)( saber)?( el| los)?( precios?)?( de| del)?\s*[:\-]?/i, (m) => (m.length < 80 ? "" : m))
    .replace(/\b(por|x)\s*(kg|kilo)\b/gi, "");
  const partes = limpio
    .split(/\n|,|;|•|\s-\s|\by\b(?=\s+[a-záéíóúñ])/i)
    .map((p) => p.replace(/^[\s\-*•\d.)]+/, "").replace(/[.?!]+$/, "").trim())
    .filter((p) => p.length >= 3 && p.length <= 60 && !/^(hola|buen[oa]s?|gracias|sii?|pero|por ejemplo)\b/i.test(p));
  return partes.length >= 3 ? partes.slice(0, 15) : [];
}

/** La lista armada por el código reemplaza la respuesta solo si al menos la mitad de lo pedido son productos que existen. */
export function listaDeVerdad(encontrados: number, pedidos: number): boolean {
  return encontrados > 0 && encontrados * 2 >= pedidos;
}
