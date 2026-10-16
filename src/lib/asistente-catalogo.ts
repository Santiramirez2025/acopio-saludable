// Búsqueda de productos del asistente. Vive acá y no en la ruta porque la usan dos cosas:
// el asistente de reglas y el vendedor con IA, que necesita los mismos precios reales.

import { normalizar, palabrasClave } from "./asistente";
import { combosTienda, productosTienda, type ComboTienda, type ProductoTienda } from "./tienda";
import { pesos, renglonCombo } from "./precios";
import { AVISO_SUPLEMENTOS } from "./sitio";

export type Enlace = { href: string; texto: string; externo?: boolean };
export type Ficha = { href: string; nombre: string; detalle: string; precio: string; foto: string | null };
/** Un botón que suma algo al pedido desde el chat. El id lo valida el servidor contra el catálogo. */
export type Accion = { tipo: "agregar"; clase: "producto" | "combo"; id: string; nombre: string; cantidad: number; precio: string };
/** `derivar`: el vendedor pidió que siga una persona (en WhatsApp, el bot se calla a partir de acá). */
/** `opciones`: respuestas cortas para tocar (en WhatsApp son botones; en la web, chips). */
/** Envío cotizado para la zona que dijo la persona. costo null: «se ve con el código postal». */
export type EnvioCotizado = { lugar: string; costo: number | null; detalle: string };
export type Respuesta = { texto: string; enlaces?: Enlace[]; fichas?: Ficha[]; acciones?: Accion[]; aviso?: string; derivar?: boolean; opciones?: string[]; envio?: EnvioCotizado };

type Indexado = ProductoTienda & { nombre: string; indice: string };

// El catálogo publicado cambia pocas veces al día: se guarda unos minutos para no leerlo en cada mensaje.
let cache: { hasta: number; productos: Indexado[] } | null = null;

export async function catalogo(): Promise<Indexado[]> {
  if (cache && cache.hasta > Date.now()) return cache.productos;
  const productos = (await productosTienda({})).map((p) => ({
    ...p,
    nombre: ` ${normalizar(p.producto)} `,
    indice: ` ${normalizar(`${p.producto} ${p.marca} ${p.presentacion} ${p.categoria}`)} `,
  }));
  cache = { hasta: Date.now() + 5 * 60 * 1000, productos };
  return productos;
}

/** Los productos que mejor coinciden, ordenados. Sin armar respuesta: lo usa el vendedor con IA. */
export async function hallarProductos(texto: string, soloSinTacc = false): Promise<ProductoTienda[]> {
  const grupos = palabrasClave(texto);
  if (!grupos.length) return [];
  const productos = (await catalogo()).filter((p) => !soloSinTacc || p.sinTacc);
  // Vale más que la palabra sea el comienzo del nombre que una mención en la marca o la categoría.
  const puntosDe = (p: Indexado) =>
    grupos.reduce(
      (s, g) =>
        s +
        (g.some((v) => p.nombre.startsWith(` ${v}`))
          ? 4
          : g.some((v) => p.nombre.includes(` ${v}`))
            ? 3
            : g.some((v) => p.indice.includes(` ${v}`))
              ? 2
              : g.some((v) => p.indice.includes(v))
                ? 1
                : 0),
      0,
    );
  const coincide = (indice: string) => grupos.every((g) => g.some((v) => indice.includes(v)));
  let hallados = productos.filter((p) => coincide(p.indice));
  if (!hallados.length && grupos.length > 1) hallados = productos.filter((p) => puntosDe(p) > 0);
  return hallados
    .map((p, i) => ({ p, i, s: puntosDe(p) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.p);
}

/**
 * Los combos que coinciden con lo que se busca, por su nombre o por lo que traen.
 * Sin esto, «despensa de 4 kilos» no aparecía en ninguna búsqueda y el vendedor decía que no existía.
 */
export async function hallarCombos(texto: string): Promise<ComboTienda[]> {
  const grupos = palabrasClave(texto);
  if (!grupos.length) return [];
  const combos = (await combosTienda({ activo: true, tipo: "COMBO" })).filter((c) => c.disponible);
  const indice = (c: ComboTienda) => ` ${normalizar(`${c.nombre} ${c.items.map((i) => i.producto.producto).join(" ")}`)} `;
  const puntos = (c: ComboTienda) => {
    const n = ` ${normalizar(c.nombre)} `;
    const i = indice(c);
    return grupos.reduce((s, g) => s + (g.some((v) => n.includes(v)) ? 3 : g.some((v) => i.includes(v)) ? 1 : 0), 0);
  };
  return combos
    .map((c) => ({ c, s: puntos(c) }))
    .filter((x) => x.s >= Math.max(1, grupos.length))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.c);
}

/** El combo que nombra un anuncio («Despensa de 4 kilos a $35.268»), si hay uno. */
export async function comboDelAnuncio(texto: string): Promise<ComboTienda | null> {
  const t = ` ${normalizar(texto)} `;
  const combos = (await combosTienda({ activo: true, tipo: "COMBO" })).filter((c) => c.disponible);
  return combos.filter((c) => t.includes(` ${normalizar(c.nombre)} `)).sort((a, b) => b.nombre.length - a.nombre.length)[0] ?? null;
}

export async function buscarEnCatalogo(texto: string, soloSinTacc = false): Promise<Respuesta> {
  const grupos = palabrasClave(texto);
  if (!grupos.length) {
    return { texto: "Contame qué estás buscando, por ejemplo «almendras» o «harina sin TACC», o elegí una de las opciones." };
  }
  const hallados = await hallarProductos(texto, soloSinTacc);
  const consulta = grupos.map((g) => g[0]).join(" ");
  const combos = soloSinTacc
    ? []
    : (await combosTienda({ activo: true, tipo: "COMBO" }))
        .filter((c) => c.disponible && grupos.some((g) => g.some((v) => normalizar(c.nombre).includes(v))))
        .slice(0, 1);

  if (!hallados.length && !combos.length) {
    return {
      texto: `No encontré «${consulta}»${soloSinTacc ? " sin TACC" : ""} en el catálogo. Probá con otra palabra o mirá las góndolas.`,
      enlaces: [{ href: "/catalogo", texto: "Ver el catálogo" }, { href: "/combos", texto: "Ver combos" }],
    };
  }
  const fichas: Ficha[] = [
    // El detalle de un combo es todo lo que trae: saber qué se lleva no puede depender de entrar a la ficha.
    ...combos.map((c) => ({
      href: `/combos/${c.slug}`,
      nombre: `Combo ${c.nombre}`,
      detalle: `Trae: ${c.items.map(({ producto, cantidad }) => renglonCombo(producto, cantidad)).join(" · ")}`,
      precio: pesos(Math.round(c.precio)),
      foto: c.fotoUrl,
    })),
    ...hallados.slice(0, 4 - combos.length).map((p) => ({
      href: `/producto/${p.codigo}`,
      nombre: p.producto,
      detalle: [p.marca.startsWith("Sin marca") ? "" : p.marca, p.presentacion].filter(Boolean).join(" · "),
      precio: pesos(p.precio),
      foto: p.fotoUrl,
    })),
  ];
  const total = hallados.length + combos.length;
  return {
    texto:
      total > fichas.length
        ? `Encontré ${total} opciones. Estas son las primeras:`
        : total === 1
          ? "Encontré esto:"
          : "Encontré estas opciones:",
    fichas,
    enlaces: total > fichas.length ? [{ href: `/catalogo?q=${encodeURIComponent(consulta)}`, texto: "Ver todos los resultados" }] : undefined,
    aviso: hallados.slice(0, 4).some((p) => p.esSuplemento) ? AVISO_SUPLEMENTOS : undefined,
  };
}
