// Mensajes interactivos de WhatsApp: botones, listas y botón con link.
//
// Puro a propósito (sin base ni red): arma lo que se manda y se prueba sin gastar nada.
//
// Por qué botones y no links: la gente desconfía de un link suelto que le manda un número
// que no conoce, y escribir cansa. Un botón se toca, se ve oficial y la charla avanza sola.
// El link aparece recién cuando la persona eligió pagar, y va dentro de un botón «Pagar».

import { pesos } from "./precios";
import type { EnvioCotizado, Ficha, Respuesta } from "./asistente-catalogo";

export type Boton = { id: string; titulo: string };
export type Fila = { id: string; titulo: string; descripcion?: string };

export type Saliente =
  | { tipo: "texto"; texto: string }
  | { tipo: "imagen"; url: string; pie?: string }
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
          // Con entrega propia se puede pagar al recibir; si no, el tercer botón es sumar algo más.
          pedido.envio.propia
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
    // Si hay nombres repetidos (la misma almendra en tres tamaños), lo que distingue es la presentación:
    // va en el título, que es lo que se lee primero. Antes salían tres «Almendras Non Pareil» iguales.
    const nombres = fichas.map(({ f }) => f.nombre.replace(/^Combo /, ""));
    const repetido = (n: string) => nombres.filter((x) => x.toLowerCase() === n.toLowerCase()).length > 1;
    const filas: Fila[] = fichas.slice(0, 6).map(({ f, c }, i) => {
      const nombre = nombres[i];
      const pres = presentacionDe(f);
      const titulo = repetido(nombre) && pres ? `${pres.replace(/^x\s*/i, "")} · ${nombre}` : nombre;
      return {
        id: corte(`${ID.quiero}${c!.clase}|${c!.id}`, TOPE.id),
        titulo: corte(titulo, TOPE.filaTitulo),
        descripcion: corte([f.precio, f.detalle.startsWith("Trae:") ? f.detalle : pres || f.detalle].filter(Boolean).join(" · "), TOPE.filaDesc),
      };
    });
    const secciones = [{ titulo: "Tocá el que querés", filas }];
    const extra = (r.opciones ?? []).slice(0, 3).map((o) => ({ id: corte(`${ID.opcion}${o}`, TOPE.id), titulo: corte(o, TOPE.filaTitulo) }));
    if (extra.length) secciones.push({ titulo: "O respondé", filas: extra });
    salida.push({ tipo: "lista", cuerpo: corte(texto + aviso, TOPE.cuerpo), boton: "Ver precios", secciones });
    return salida;
  }

  if (r.opciones?.length) {
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
  const t = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (t.length > 160) return false;
  if (/\b(lo quiero|la quiero|quiero (el|la|los|las|uno|una)|separamel|dejamel|agregal|anotal|mandamel|como (pago|hago)|pasame (el|los) (alias|cbu|link))\b/.test(t)) return false;
  return /\b(lo|la|los|las) (veo|miro|reviso|pienso|charlo|hablo|consulto)\b|\bveo tra?n?quil|\b(miro|reviso|veo) (con calma|tranquil|bien)|\b(lo|la) voy a (pensar|ver|mirar|consultar)|\bvoy a (pensar|ver|mirar)lo\b|\b(despues|luego|mas tarde|manana|en un rato|en otro momento|la semana que viene|cuando (cobre|pueda|vuelva))\b.*\b(te )?(escribo|aviso|confirmo|hablo|encargo|pido)|\bte (escribo|aviso|confirmo|hablo) (despues|luego|mas tarde|manana|en un rato|para encargar)|\bte escribo para (encargar|pedir)|\b(cualquier cosa|si me decido) te (escribo|aviso)|\b(pregunto|consulto|averiguo|veo|lo hablo|lo charlo) y te (digo|aviso|confirmo|escribo|cuento)/.test(t);
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

/** ¿Pasó una dirección? Una calle con número, o «esquina», «barrio», «casa», «depto». */
export function tieneDireccion(texto: string): boolean {
  const t = limpio(texto);
  return /\b(direccion|calle|avenida|av\.|pasaje|esquina|barrio|b°|manzana|lote|depto|departamento|piso|casa (blanca|azul|verde|amarilla|roja|gris|de|con))\b/.test(t) || /\b(?!quiero|dame|mandame|sumame|agregame|son|sale|cuesta|precio|total|hasta|cada|minimo|compra)[a-z]{3,}(?: [a-z]{2,})? \d{1,5}\b(?! ?(kg|kilos?|k\b|gr|gramos|g\b|unid|unidades|u\b|pesos|\$|%|x\b|cajas?|bolsas?|paquetes?))/.test(t);
}

/** «Gracias», «ok, gracias», «👍» solos: se agradece corto y sin botones, sin volver a ofrecer. */
export function soloAgradece(texto: string): boolean {
  // «?» o «??» no es un gracias: está esperando la respuesta a algo que preguntó.
  if (texto.includes("?")) return false;
  const t = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  return /^((ok|oka|okey|dale|bueno|listo|genial|perfecto|joya|buenisimo|barbaro)\s)?(muchas\s)?(gracias|graciass+|grax|mil gracias)(\s(a vos|igualmente|che|genio|capo))?$/.test(t) || /^(ok|oka|okey|joya)$/.test(t) || t === "";
}

/** La respuesta a «lo veo tranquila»: cálida, corta, sin pedido ni zonas. Solo la tienda, por si quiere ir mirando. */
export function planDeNada(nombre: string | null): Saliente[] {
  const quien = nombre ? `, ${nombre.split(/\s+/)[0].slice(0, 20)}` : "";
  return [{ tipo: "texto", texto: `¡De nada${quien}! Cualquier cosa me escribís por acá 🙌` }];
}

export function planSinApuro(nombre: string | null, tienda: string): Saliente[] {
  const quien = nombre ? `, ${nombre.split(/\s+/)[0].slice(0, 20)}` : "";
  return [{
    tipo: "cta",
    cuerpo: `¡Dale${quien}! Miralo con calma, no hay apuro 🙌 Cuando quieras me escribís y te armo el pedido como prefieras. Si te surge cualquier duda, acá estoy.`,
    texto: "Ver la tienda",
    url: tienda,
  }];
}

export function planVer(combos: { slug: string; nombre: string; precio: string; argumento: string }[], tienda?: string): Saliente[] {
  const filas: Fila[] = combos.slice(0, 7).map((c) => ({
    id: corte(`${ID.trae}${c.slug}`, TOPE.id),
    titulo: corte(c.nombre, TOPE.filaTitulo),
    descripcion: corte([c.precio, c.argumento].filter(Boolean).join(" · "), TOPE.filaDesc),
  }));
  const tipos = ["Frutos secos", "Sin TACC", "Para el desayuno"].map((t) => ({ id: `${ID.opcion}${t}`, titulo: t }));
  return [
    {
      tipo: "lista",
      cuerpo:
        "Te paso los combos armados 👇 Cada uno trae todo para el mes y llega solo a la compra mínima. Tocá el que te guste y te cuento qué trae. Si buscás algo puntual, escribime qué y te lo busco.",
      boton: "Ver combos",
      secciones: [
        { titulo: "Combos", filas },
        { titulo: "O buscá por tipo", filas: tipos },
      ],
    },
    // La web, como botón y no como link suelto: se ve oficial y ahí está todo con fotos.
    ...(tienda
      ? [{ tipo: "cta" as const, cuerpo: "Y si preferís mirar todo tranquilo, con fotos y precios, está en nuestra tienda online. Cualquier cosa me escribís y te armo el pedido.", texto: "Ver la tienda", url: tienda, pie: "acopiosaludable.com" }]
      : []),
  ];
}

/** «¿Qué trae?» de un combo: la lista completa y el botón para llevarlo. Fijo, sin modelo. */
export function planTrae(c: { slug: string; nombre: string; precio: string; argumento: string; renglones: string[] }): Saliente[] {
  const cuerpo = [`El combo ${c.nombre} trae:`, ...c.renglones.map((r) => `• ${r}`), "", `Todo por ${c.precio}${c.argumento ? ` (${c.argumento})` : ""} y ya llega a la compra mínima. Yo te lo armo y te lo llevo.`].join("\n");
  return [
    {
      tipo: "botones",
      cuerpo: corte(cuerpo, TOPE.cuerpo),
      botones: [
        { id: corte(`${ID.quiero}c|${c.slug}`, TOPE.id), titulo: "Lo quiero 🛒" },
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
      return s.pie ?? "";
    case "botones":
      return s.cuerpo;
    case "lista":
      return [s.cuerpo, ...s.secciones[0].filas.map((f) => `• ${f.titulo}${f.descripcion ? ` — ${f.descripcion.split(" · ")[0]}` : ""}`)].join("\n");
    case "cta":
      return `${s.cuerpo}\n${s.url}`;
  }
}
