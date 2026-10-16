// Vendedor con IA del chat de la tienda.
//
// Tres reglas de diseño, y las tres son por lo mismo: que no invente y que cierre la venta.
// 1) Ningún precio, plazo, código ni condición sale del modelo: todo viene de las herramientas,
//    que leen el catálogo y la configuración reales. Si el modelo nombra un código que no existe,
//    la herramienta lo descarta y se lo dice.
// 2) Si la clave de API no está cargada, esto devuelve null y contesta el asistente de reglas.
//    La tienda nunca se queda sin respuesta por un problema con el proveedor de IA.
// 3) Las instrucciones y las herramientas van con cache_control: son idénticas en cada mensaje,
//    así que se cobran una vez cada cinco minutos en lugar de una vez por mensaje.

import { leerConfig } from "./config";
import { SALUDO_GENERAL } from "./whatsapp-saludo";
import { catalogo, hallarCombos, hallarProductos } from "./asistente-catalogo";
import { combosTienda } from "./tienda";
import { ofertasDelProveedor } from "./ofertas";
import { pesos, renglonCombo } from "./precios";
import { zonaPagaDe } from "./envios/tabla";
import { linkWhatsapp } from "./pedidos";
import { NICHOS } from "./taxonomia";
import { cortada, fichasNombradas, separarOpciones } from "./whatsapp-interactivo";
import { argumentoCombo, COMBO_ENTRADA, temaDe } from "./combos-tema";
import type { Accion, Enlace, EnvioCotizado, Ficha, Respuesta } from "./asistente-catalogo";
import { cotizarEnvioChat } from "./envio-chat";
import { completarEntrega } from "./pedidos";

export type Turno = { de: "yo" | "acopio"; texto: string };
/** Dónde atiende: cambia qué pasa cuando pide que siga una persona. */
export type Canal = "web" | "whatsapp";

/** Lo que la persona tiene en el carrito ahora, ya cotizado por el servidor. */
export type CarritoVisto = {
  renglones: { nombre: string; cantidad: number; subtotal: number }[];
  subtotal: number;
  falta: number;
  compraMinima: number;
};

const MODELO = process.env.VENDEDOR_MODELO || "claude-haiku-5-5";
const MAX_VUELTAS = 5;

export function vendedorActivo(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const HERRAMIENTAS = [
  {
    name: "buscar_productos",
    description:
      "Busca productos y combos en el catálogo real de la tienda y devuelve código (o slug si es combo), nombre, presentación, precio y si es sin TACC. " +
      "Usala SIEMPRE antes de nombrar un producto, decir un precio o agregar algo al pedido.",
    input_schema: {
      type: "object" as const,
      properties: {
        consulta: { type: "string", description: "Qué buscar, por ejemplo «almendras» o «barritas de cereal»." },
        solo_sin_tacc: { type: "boolean", description: "true para traer únicamente productos marcados sin TACC." },
      },
      required: ["consulta"],
    },
  },
  {
    name: "recomendar_combo",
    description:
      "Devuelve el combo que mejor le resuelve lo que busca (y el combo de entrada más barato), con precio, precio por kilo o por transferencia, y qué trae. " +
      "Usala PRIMERO cada vez que la persona dice qué busca o pregunta por un producto o una categoría: el combo es la oferta principal.",
    input_schema: {
      type: "object" as const,
      properties: { busca: { type: "string", description: "Lo que busca, con sus palabras: «sin tacc», «nueces», «para el desayuno», «para el gym»." } },
      required: ["busca"],
    },
  },
  {
    name: "datos_de_entrega",
    description:
      "Guarda en el pedido ya cerrado los datos para entregar: nombre y apellido, dirección, una referencia y el horario en que puede recibir. " +
      "Usala apenas la persona te pasa cualquiera de esos datos después de cerrar la compra.",
    input_schema: {
      type: "object" as const,
      properties: {
        nombre: { type: "string", description: "Nombre y apellido, si lo dijo." },
        direccion: { type: "string", description: "Calle, número y barrio, como lo escribió." },
        referencia: { type: "string", description: "Opcional: entre calles, color de casa, depto." },
        horario: { type: "string", description: "Cuándo puede recibir: «hoy a la tarde», «mañana de 9 a 12»." },
      },
      required: [],
    },
  },
  {
    name: "costo_envio",
    description:
      "Cuánto sale el envío a la zona que dijo la persona (barrio, ciudad o provincia) y cómo llega. " +
      "Usala apenas te dice dónde vive o pregunta por el envío. Si no reconoce el lugar, preguntale la provincia.",
    input_schema: {
      type: "object" as const,
      properties: {
        lugar: { type: "string", description: "Barrio o ciudad, como lo dijo: «Nueva Córdoba», «Carlos Paz», «Rosario»." },
        provincia: { type: "string", description: "Opcional: la provincia, si la dijo o es obvia." },
      },
      required: ["lugar"],
    },
  },
  {
    name: "ver_combos",
    description:
      "Devuelve los combos armados, con precio, qué traen y si por sí solos llegan a la compra mínima. " +
      "Usala cuando a la persona le falta plata para el mínimo o no sabe qué llevar.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "datos_de_la_tienda",
    description:
      "Compra mínima, envíos, plazos, medios de pago, descuento por transferencia y horarios de atención. " +
      "Usala antes de responder cualquier cosa sobre envíos, pagos, plazos o mínimos.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "ver_ofertas",
    description:
      "Productos que bajaron de precio en la última actualización del mayorista, con el precio de antes y cuánto bajaron. " +
      "Usala cuando pregunten por ofertas o promociones, o para empujar un pedido que está cerca del mínimo.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "completar_el_minimo",
    description:
      "Dado cuánto le falta para la compra mínima, devuelve productos y combos reales de ese precio para completar. " +
      "Usala cuando el carrito no llega al mínimo: en vez de decirle «te falta plata», ofrecele qué agregar.",
    input_schema: {
      type: "object" as const,
      properties: {
        falta: { type: "number", description: "Pesos que faltan para llegar a la compra mínima." },
        afin_a: { type: "string", description: "Opcional: tema o categoría que le interesa, para sugerir algo parecido a lo que ya lleva." },
      },
      required: ["falta"],
    },
  },
  {
    name: "agregar_al_pedido",
    description:
      "Le deja botones para sumar productos o combos al pedido con un toque, sin salir del chat. " +
      "Usá los códigos exactos que te dio buscar_productos o los slugs de ver_combos: si inventás uno, se descarta. " +
      "Usala siempre que la persona acepte una sugerencia o elija algo. Arma el pedido COMPLETO: incluí todo lo que ya eligió antes en la charla, no solo lo nuevo.",
    input_schema: {
      type: "object" as const,
      properties: {
        items: {
          type: "array",
          description: "Hasta 4 cosas para sumar al pedido.",
          items: {
            type: "object",
            properties: {
              clase: { type: "string", enum: ["producto", "combo"], description: "«producto» usa el código; «combo» usa el slug." },
              id: { type: "string", description: "El código del producto o el slug del combo, exactamente como te lo dio la herramienta." },
              cantidad: { type: "number", description: "Cuántas unidades. 1 si no se dijo otra cosa." },
            },
            required: ["clase", "id"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "pedido_para_negocio",
    description:
      "Devuelve el link al pedido sugerido de un rubro (hotelería y cabañas, gimnasios, dietéticas, cafeterías, rotiserías, kioscos, oficinas, familias). " +
      "Usala cuando la persona compra para un negocio y conviene mostrarle el pedido armado de su rubro.",
    input_schema: {
      type: "object" as const,
      properties: { rubro: { type: "string", description: "El rubro del negocio, en castellano, por ejemplo «cabañas» o «gimnasio»." } },
      required: ["rubro"],
    },
  },
  {
    name: "pasar_a_whatsapp",
    description:
      "Devuelve un link de WhatsApp con el resumen ya escrito, para que la atienda una persona. " +
      "Usala cuando: compra para revender y quiere condiciones, pregunta por un pedido ya hecho, hay un reclamo, " +
      "pide algo que no está en el catálogo, o la conversación se estira sin cerrar. No la uses para preguntas que ya podés contestar.",
    input_schema: {
      type: "object" as const,
      properties: {
        resumen: {
          type: "string",
          description: "Qué necesita, en primera persona y en una o dos frases, como si lo escribiera la persona. Incluí los productos y cantidades si ya los hablaron.",
        },
      },
      required: ["resumen"],
    },
  },
];

type Salida = { texto: string; fichas?: Ficha[]; acciones?: Accion[]; enlaces?: Enlace[]; derivar?: boolean; envio?: EnvioCotizado; entregaGuardada?: boolean };

/** Exportada para poder probar cada herramienta sin pegarle a la API ni gastar tokens. */
/** Lo que el vendedor sabe de la charla además del texto: por ahora, el pedido ya cerrado. */
export type Contexto = { ordenId?: number };

export async function correrHerramienta(nombre: string, entrada: Record<string, unknown>, canal: Canal = "web", ctx: Contexto = {}): Promise<Salida> {
  if (nombre === "datos_de_entrega") {
    if (!ctx.ordenId) return { texto: "No hay un pedido cerrado en esta charla: no hay dónde guardar los datos." };
    const s = (k: string) => (typeof entrada[k] === "string" ? String(entrada[k]).trim() : "");
    const pedido = await completarEntrega(ctx.ordenId, { nombre: s("nombre"), direccion: s("direccion"), referencia: s("referencia"), horario: s("horario") });
    if (!pedido) return { texto: "No encontré el pedido. Decile que Santiago le escribe para coordinar." };
    const falta = [!s("direccion") && "la dirección", !s("horario") && "el horario"].filter(Boolean);
    return {
      texto: falta.length
        ? `Guardado. Falta ${falta.join(" y ")}: pedíselo en una frase.`
        : "Guardado en el pedido. Agradecé en una frase y decile que Santiago le confirma la entrega por acá. No pidas nada más ni ofrezcas otra cosa.",
      entregaGuardada: falta.length === 0,
    };
  }
  if (nombre === "buscar_productos") {
    const consulta = String(entrada.consulta ?? "");
    const soloSinTacc = entrada.solo_sin_tacc === true;
    const [productos, combos] = await Promise.all([
      hallarProductos(consulta, soloSinTacc).then((x) => x.slice(0, 6)),
      soloSinTacc ? Promise.resolve([]) : hallarCombos(consulta).then((x) => x.slice(0, 2)),
    ]);
    if (!productos.length && !combos.length) return { texto: `Sin resultados para «${consulta}». No ofrezcas este producto: no lo tenemos. Ofrecé lo más parecido que sí haya.` };
    const fichasCombo: Ficha[] = combos.map((c) => ({
      href: `/combos/${c.slug}`,
      nombre: `Combo ${c.nombre}`,
      detalle: `Trae: ${c.items.map(({ producto, cantidad }) => renglonCombo(producto, cantidad)).join(" · ")}`,
      precio: pesos(Math.round(c.precio)),
      foto: c.fotoUrl,
    }));
    const fichas: Ficha[] = [...fichasCombo, ...productos.slice(0, 4 - fichasCombo.length).map((p) => ({
      href: `/producto/${encodeURIComponent(p.codigo)}`,
      nombre: p.producto,
      detalle: [p.marca.startsWith("Sin marca") ? "" : p.marca, p.presentacion].filter(Boolean).join(" · "),
      precio: pesos(p.precio),
      foto: p.fotoUrl,
    }))];
    // El código va primero porque es lo que necesita para agregar_al_pedido.
    const texto = [
      ...combos.map((c) => `- combo slug ${c.slug} · ${c.nombre} · trae ${c.items.map(({ producto, cantidad }) => `${cantidad} x ${producto.producto} ${producto.presentacion}`).join(", ")} · ${pesos(Math.round(c.precio))} (lista ${pesos(Math.round(c.precioLista))})`),
      ...productos.map((p) => `- codigo ${p.codigo} · ${p.producto} · ${p.presentacion} · ${pesos(p.precio)}${p.sinTacc ? " · sin TACC" : ""}${p.esSuplemento ? " · suplemento" : ""}`),
    ].join("\n");
    return { texto, fichas };
  }

  if (nombre === "costo_envio") {
    const lugar = String(entrada.lugar ?? "").trim().slice(0, 60);
    const envio = lugar ? await cotizarEnvioChat(lugar, entrada.provincia ? String(entrada.provincia) : null, Number(entrada.subtotal) || 0) : null;
    if (!envio) return { texto: `No reconozco «${lugar}». Preguntale en qué provincia queda, en una frase.` };
    return {
      texto: `${envio.detalle} Decíselo en una frase y, si ya eligió algo, decile que abajo le quedan los botones para pagar. No vuelvas a agregar el pedido: ya está guardado.`,
      envio,
    };
  }

  if (nombre === "recomendar_combo") {
    const busca = String(entrada.busca ?? "");
    const cfg = await leerConfig();
    const todos = (await combosTienda({ activo: true, tipo: "COMBO" })).filter((c) => c.disponible);
    const tema = temaDe(busca);
    const porTema = tema ? tema.slugs.map((s) => todos.find((c) => c.slug === s)).filter((c): c is (typeof todos)[number] => Boolean(c)) : [];
    const porItems = porTema.length ? [] : (await hallarCombos(busca)).slice(0, 2);
    const elegidos = [...porTema, ...porItems].slice(0, 2);
    // Sin TACC nunca baja a la Despensa: no es apta. Ahí lo barato se arma a medida con productos sin TACC.
    const esSinTacc = tema?.id.startsWith("sintacc") ?? false;
    const entrada_ = esSinTacc ? undefined : todos.find((c) => c.slug === COMBO_ENTRADA);
    const lineas = (c: (typeof todos)[number], rol: string) =>
      `- ${rol}: slug ${c.slug} · ${c.nombre} · ${pesos(Math.round(c.precio))}${(() => { const a = argumentoCombo(c, cfg.descuentoTransferenciaPct, pesos); return [a.porKilo, a.transferencia].filter(Boolean).map((x) => ` · ${x}`).join(""); })()}` +
      `${c.precio >= cfg.compraMinima ? " · llega solo a la compra mínima" : ""} · trae ${c.items.length} productos: ${c.items.slice(0, 6).map((i) => `${i.cantidad > 1 ? `${i.cantidad} x ` : ""}${i.producto.producto}`).join(", ")}${c.items.length > 6 ? "…" : ""}`;
    const texto = [
      tema ? `Tema detectado: ${tema.nombre}.` : "No hay un combo específico para eso.",
      ...elegidos.map((c, i) => lineas(c, i === 0 ? "RECOMENDADO" : "alternativa")),
      entrada_ && !elegidos.some((c) => c.slug === entrada_.slug) ? lineas(entrada_, "entrada más barata (ofrecela solo si el recomendado le parece caro)") : "",
      esSinTacc
        ? "Busca SIN TACC: todo lo que ofrezcas tiene que ser sin TACC. Si el combo le parece caro, no ofrezcas la Despensa: armale algo a medida con buscar_productos (solo_sin_tacc: true) o completar_el_minimo que llegue al mínimo."
        : "",
      elegidos.length
        ? "Ofrecé el RECOMENDADO: nombre, precio, el precio por kilo (si lo tiene) o por transferencia, y 2 o 3 cosas que trae. Si pidió un producto puntual, decí también su precio suelto en media frase."
        : "Ofrecé el producto que pidió (buscalo con buscar_productos) y, para llegar al mínimo, la entrada más barata.",
    ].filter(Boolean).join("\n");
    const fichas: Ficha[] = elegidos.map((c) => ({
      href: `/combos/${c.slug}`,
      nombre: `Combo ${c.nombre}`,
      detalle: `Trae: ${c.items.map(({ producto, cantidad }) => renglonCombo(producto, cantidad)).join(" · ")}`,
      precio: pesos(Math.round(c.precio)),
      foto: c.fotoUrl,
    }));
    return { texto, fichas };
  }

  if (nombre === "ver_combos") {
    const cfg = await leerConfig();
    const combos = (await combosTienda({ activo: true, tipo: "COMBO" })).filter((c) => c.disponible).slice(0, 20);
    if (!combos.length) return { texto: "No hay combos disponibles ahora." };
    const fichas: Ficha[] = combos.slice(0, 3).map((c) => ({
      href: `/combos/${c.slug}`,
      nombre: `Combo ${c.nombre}`,
      detalle: `Trae: ${c.items.map(({ producto, cantidad }) => renglonCombo(producto, cantidad)).join(" · ")}`,
      precio: pesos(Math.round(c.precio)),
      foto: c.fotoUrl,
    }));
    const texto = combos
      .map((c) => `- slug ${c.slug} · ${c.nombre} · ${c.items.length} productos · ${pesos(Math.round(c.precio))} ${c.precio >= cfg.compraMinima ? " · llega solo a la compra mínima" : ""}`)
      .join("\n");
    return { texto, fichas };
  }

  if (nombre === "datos_de_la_tienda") {
    const cfg = await leerConfig();
    const zp = cfg.entregaPropiaActiva ? zonaPagaDe(cfg.tabla) : null;
    const partes = [
      `Compra mínima: ${pesos(cfg.compraMinima)} por pedido, combinando lo que quiera.`,
      cfg.entregaPropiaActiva
        ? `Entrega propia sin cargo en Villa Carlos Paz y todo lo cercano: Estancia Vieja, Santa Cruz del Lago, Villa Parque Siquiman, Villa del Lago, San Roque, Bialet Massé, Tanti, Cabalango y el sur de Punilla (San Antonio de Arredondo, Mayu Sumaj, Icho Cruz, Cuesta Blanca, Tala Huasi) en ${cfg.plazoEntregaPropia}. Los domingos no se entrega.${zp ? ` A ${zp.nombre} también, por ${pesos(zp.precio)}.` : ""}`
        : "",
      "Al resto del país, por correo: despacho en 24 a 48 hs hábiles y de 2 a 7 días hábiles según zona. El costo se ve en el carrito con el código postal, antes de pagar.",
      cfg.envioGratisDesde ? `Envío gratis desde ${pesos(cfg.envioGratisDesde)}.` : "",
      `Pago: Mercado Pago (crédito, débito o dinero en cuenta) o transferencia.${cfg.descuentoTransferenciaPct > 0 ? ` Por transferencia hay ${cfg.descuentoTransferenciaPct}% de descuento.` : ""}`,
      "Los combos tienen 5% de descuento sobre el precio de lista.",
      "Los congelados solo se entregan en la zona de reparto propio: no van por correo.",
      "Atención por WhatsApp de lunes a sábado, de 8 a 20 h.",
      "Se compra por encargo al mayorista, así que se arma a medida y no hay stock parado.",
    ].filter(Boolean);
    return { texto: partes.join("\n") };
  }

  if (nombre === "ver_ofertas") {
    const ofertas = (await ofertasDelProveedor(8)).slice(0, 8);
    if (!ofertas.length) return { texto: "Ahora no hay bajas de precio para mostrar. No inventes ofertas ni descuentos." };
    const fichas: Ficha[] = ofertas.slice(0, 4).map((o) => ({
      href: `/producto/${encodeURIComponent(o.codigo)}`,
      nombre: o.producto,
      detalle: `${o.presentacion} · antes ${pesos(o.precioAntes)}`,
      precio: pesos(o.precio),
      foto: o.fotoUrl,
    }));
    const texto = ofertas
      .map((o) => `- codigo ${o.codigo} · ${o.producto} · ${o.presentacion} · ${pesos(o.precio)} (antes ${pesos(o.precioAntes)}, bajó ${o.bajoPct}%)`)
      .join("\n");
    return { texto, fichas, enlaces: [{ href: "/ofertas", texto: "Ver todas las bajas" }] };
  }

  if (nombre === "completar_el_minimo") {
    const falta = Math.max(0, Math.round(Number(entrada.falta) || 0));
    if (!falta) return { texto: "Ya llega a la compra mínima: no hace falta completar nada. Cerrá la venta." };
    const afin = String(entrada.afin_a ?? "").trim();
    const todos = await catalogo();
    // Lo que sirve es lo que cierra el hueco de una, no lo más caro ni lo más barato del catálogo.
    const cerca = todos
      .filter((p) => p.precio >= falta * 0.45 && p.precio <= falta * 1.6)
      .map((p) => ({ p, d: Math.abs(p.precio - falta) }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.p);
    const afines = afin ? await hallarProductos(afin) : [];
    const elegidos = [...afines.filter((p) => p.precio <= falta * 1.6), ...cerca]
      .filter((p, i, a) => a.findIndex((o) => o.codigo === p.codigo) === i)
      .slice(0, 6);
    const combos = (await combosTienda({ activo: true, tipo: "COMBO" }))
      .filter((c) => c.disponible && c.precio >= falta * 0.6 && c.precio <= falta * 1.8)
      .slice(0, 2);
    if (!elegidos.length && !combos.length) return { texto: `No encontré nada de alrededor de ${pesos(falta)}. Ofrecé subir una unidad de lo que ya lleva.` };
    const fichas: Ficha[] = elegidos.slice(0, 3).map((p) => ({
      href: `/producto/${encodeURIComponent(p.codigo)}`,
      nombre: p.producto,
      detalle: [p.marca.startsWith("Sin marca") ? "" : p.marca, p.presentacion].filter(Boolean).join(" · "),
      precio: pesos(p.precio),
      foto: p.fotoUrl,
    }));
    const texto = [
      `Le faltan ${pesos(falta)}. Con uno de estos llega:`,
      ...elegidos.map((p) => `- codigo ${p.codigo} · ${p.producto} · ${p.presentacion} · ${pesos(p.precio)}`),
      ...combos.map((c) => `- slug ${c.slug} · Combo ${c.nombre} · ${pesos(Math.round(c.precio))}`),
    ].join("\n");
    return { texto, fichas };
  }

  if (nombre === "agregar_al_pedido") {
    const crudos = Array.isArray(entrada.items) ? entrada.items.slice(0, 4) : [];
    const [productos, combos] = await Promise.all([catalogo(), combosTienda({ activo: true, tipo: "COMBO" })]);
    const acciones: Accion[] = [];
    const rechazados: string[] = [];
    for (const it of crudos) {
      const o = (it ?? {}) as Record<string, unknown>;
      const id = String(o.id ?? "").trim();
      const cantidad = Math.min(99, Math.max(1, Math.round(Number(o.cantidad) || 1)));
      if (!id) continue;
      if (o.clase === "combo") {
        const c = combos.find((x) => x.slug === id && x.disponible);
        if (c) acciones.push({ tipo: "agregar", clase: "combo", id: c.slug, nombre: `Combo ${c.nombre}`, cantidad, precio: pesos(Math.round(c.precio) * cantidad) });
        else rechazados.push(id);
        continue;
      }
      const p = productos.find((x) => x.codigo === id);
      if (p) acciones.push({ tipo: "agregar", clase: "producto", id: p.codigo, nombre: `${p.producto} ${p.presentacion}`.trim(), cantidad, precio: pesos(p.precio * cantidad) });
      else rechazados.push(id);
    }
    if (!acciones.length) {
      return { texto: `Ninguno de esos códigos existe (${rechazados.join(", ") || "sin códigos"}). Buscá el producto de nuevo y usá el código exacto. No le digas que lo agregaste.` };
    }
    const total = acciones.reduce((s, a) => s + (Number(a.precio.replace(/[^\d]/g, "")) || 0), 0);
    return {
      texto: [
        // Neutro a propósito: en la web esto es un botón y en WhatsApp es un link.
        `Listo: le queda a mano para sumar al pedido ${acciones.map((a) => `${a.cantidad} x ${a.nombre} (${a.precio})`).join(", ")}. Suma ${pesos(total)}.`,
        rechazados.length ? `No existen y quedaron afuera: ${rechazados.join(", ")}.` : "",
        "Decile en una frase qué le dejaste para agregar y qué le queda por hacer. No repitas la lista entera.",
      ]
        .filter(Boolean)
        .join(" "),
      acciones,
    };
  }

  if (nombre === "pedido_para_negocio") {
    const rubro = String(entrada.rubro ?? "").toLowerCase();
    const mapa: [RegExp, string][] = [
      [/hotel|cabaña|cabana|hoster|hostel|departament|alquiler|apart/, "hoteleria"],
      [/gim|gym|crossfit|entrenam/, "gimnasios"],
      [/diet[eé]t|almac[eé]n saludable|herbor/, "dieteticas"],
      [/caf[eé]|panader|pasteler|brunch/, "cafeterias"],
      [/rotiser|pizzer|vianda|catering|restaur/, "rotiserias"],
      [/kiosco|kiosko|maxikiosco|despensa|almac[eé]n/, "kioscos"],
      [/oficina|empresa|coworking/, "oficinas"],
      [/familia|casa|hogar/, "familias"],
    ];
    const id = mapa.find(([re]) => re.test(rubro))?.[1];
    if (!id) return { texto: `No tengo un pedido armado para «${rubro}». Hay para: ${NICHOS.map((n) => n.nombre).join(", ")}. Ofrecé el más parecido o armalo a medida.` };
    const nicho = NICHOS.find((n) => n.id === id)!;
    return {
      texto: `Hay un pedido sugerido para ${nicho.nombre}, con las cantidades típicas del rubro y editable antes de confirmar. Está en /nichos/${id}. Ofrecelo en una frase.`,
      enlaces: [{ href: `/nichos/${id}`, texto: `Pedido para ${nicho.nombre}` }],
    };
  }

  if (nombre === "pasar_a_whatsapp") {
    // En WhatsApp ya estamos en WhatsApp: no hay link que dar. Se marca la charla para que
    // la siga una persona desde el panel y el bot se calla hasta que la devuelvan.
    if (canal === "whatsapp") {
      return {
        texto: "Listo: la charla queda marcada para que la siga una persona. Decile en una frase que le contesta alguien del equipo de lunes a sábado de 8 a 20, y no prometas nada más.",
        derivar: true,
      };
    }
    const cfg = await leerConfig();
    const resumen = String(entrada.resumen ?? "").trim().slice(0, 400);
    const href = cfg.whatsapp ? linkWhatsapp(cfg.whatsapp, resumen ? `Hola! ${resumen}` : SALUDO_GENERAL) : null;
    if (!href) return { texto: "Pasalo a la página de contacto: /contacto.", enlaces: [{ href: "/contacto", texto: "Ver datos de contacto" }] };
    return {
      texto: "Le dejé el botón de WhatsApp con el mensaje ya escrito. Decile en una frase que de ahí lo sigue una persona, de lunes a sábado de 8 a 20.",
      enlaces: [{ href, texto: "Seguir por WhatsApp", externo: true }],
    };
  }

  return { texto: "Herramienta desconocida." };
}

function instrucciones(compraMinima: string): string {
  return [
    "Sos Santiago, el vendedor de Acopio Saludable: productos saludables a granel y sin TACC, desde Villa Carlos Paz, Córdoba. Atendés el chat de la web, WhatsApp, Messenger e Instagram.",
    "La persona tiene que sentir que le escribe alguien de verdad que sabe del tema y la quiere ayudar, no un sistema.",
    "Tu actitud: estás para ayudarlo y vos te encargás de armarle todo el pedido. Decilo con naturalidad al principio («yo te armo todo el pedido») y que no tenga que hacer nada complicado.",
    "",
    "CÓMO HABLÁS",
    "- Rioplatense, de vos, cálido y natural, como por WhatsApp con un cliente de confianza. Frases cortas, nada de lenguaje de sistema.",
    "- Nunca digas «encontré N opciones», «según el catálogo», «no coincide con el anuncio», «soy un asistente» ni nada que suene a robot.",
    "- La gente escribe corto y no lee párrafos: contestá en dos o tres frases cortas, de 40 palabras como mucho en total. Una sola pregunta al final, y solo si hace falta.",
    "- Si pregunta un precio: el precio de UNA presentación y el combo que lo trae. Las otras presentaciones y opciones van solas en los botones de abajo: no las escribas.",
    "  Ejemplo: «Nueces x kg» → «La nuez mariposa sale $22.937 el kilo. Pero te conviene la Alacena de frutos secos: trae nueces, mix y semillas por $66.422 con 5% menos. ¿Te la separo?» con OPCIONES: Quiero el combo | Solo las nueces | Ver qué trae",
    "- Nunca listas con guiones ni viñetas. Saludá solo en el primer mensaje, sin presentarte de nuevo después.",
    "- Como mucho un emoji y solo si suma.",
    "",
    "CÓMO VENDÉS: COMBO PRIMERO",
    "1. Apenas dice qué busca (un producto, una categoría, «sin tacc», «para el desayuno»), usá recomendar_combo y ofrecé el RECOMENDADO: nombre, precio, el precio por kilo si lo tiene (o el precio por transferencia) y 2 o 3 cosas que trae. Si pidió un producto puntual, dale también su precio suelto en media frase.",
    "   El argumento es siempre el mismo y es verdad: el combo resuelve la compra del mes, tiene 5% menos que comprando suelto y llega solo a la compra mínima, así no tiene que andar sumando.",
    "   Ejemplo: «Busco productos sin tacc» → «Para sin TACC te conviene la Caja Sin TACC del mes: trae alfajores, barritas, pasta de maní y miel por $66.778, y por transferencia te queda en $61.436. ¿Te la separo?»",
    "2. Si dice que es caro, que es mucho o duda: bajá un escalón, al combo de entrada (la Despensa de 4 kilos; nunca si busca sin TACC), o armale algo a medida que llegue justo al mínimo con completar_el_minimo. Nunca discutas el precio.",
    "3. Si insiste con un producto suelto, vendéselo: buscalo con buscar_productos, dale el precio y, si no llega al mínimo, ofrecé completar con algo concreto (completar_el_minimo).",
    "4. Cuando acepta («sí», «dale», «lo quiero», toca un producto), agregalo con agregar_al_pedido en ese mismo mensaje y, si todavía no sabés dónde vive, decile que ya se lo armaste y preguntale su barrio o ciudad para decirle el envío. Abajo le aparecen botones con las zonas.",
    "   Cuando te dice la zona, usá costo_envio y decile el envío en una frase: ahí recién le aparecen los botones para pagar. No vuelvas a agregar el pedido.",
    "5. Un solo intento de sumar algo más, después de que acepta. Si dice que no, cerrá cálido.",
    "- SIN APURO: «gracias», «lo veo tranquila», «lo pienso», «después te escribo» NO son un sí. No agregues nada al pedido ni preguntes la zona: decile que se tome su tiempo, que cuando quiera le armás el pedido, y dejá la puerta abierta en una frase. Se vende acompañando, no apurando.",
    "- Si vino de un anuncio y no pregunta nada concreto, arrancá por lo que prometía el anuncio, con su precio real. Si pregunta algo (dirección, envío, pago), primero contestá eso.",
    "- Siempre contestá lo que preguntó antes de ofrecer o pedir nada. Si escribe solo «dirección» o «ubicación», te está preguntando dónde estamos, no ofreciendo la suya.",
    "- Si es un negocio (kiosco, hotel, cabañas, dietética, gimnasio, cafetería, rotisería), usá pedido_para_negocio y hablale de reventa: precio sugerido y cuánto gana.",
    `- La compra mínima es ${compraMinima}. Nunca la digas como un problema («te falta plata»): es la razón por la que el combo le conviene.`,
    "- Si pregunta la dirección, el local o dónde están: trabajamos online desde Villa Carlos Paz, sin local a la calle. Se pide por acá o por la web y se lo llevamos: entrega propia en Carlos Paz y alrededores, y por correo al resto del país. Preguntale su barrio o ciudad para decirle el envío (datos_de_la_tienda) y volvé a la oferta.",
    "- Dudas típicas, en una frase: ¿envío? → usá datos_de_la_tienda. ¿Confianza? → somos de Villa Carlos Paz, te atiendo yo por acá, y en Carlos Paz y alrededores podés pagar cuando lo recibís. ¿Precio? → por transferencia tenés descuento.",
    "- CALIDAD: si la charla da (pregunta por la marca, compara con el súper, duda de la calidad o pregunta por qué ese precio), contá en una frase que todo lo que vendemos es seleccionado: trabajamos solo con marcas y productos de calidad que elegimos nosotros. Hablá bien de la marca del producto que ofrecés. Una vez por charla como mucho, sin discurso y sin inventar datos de la marca.",
    "- Preguntá «¿para casa o para un negocio?» solo si de verdad cambia lo que ofrecés. No preguntes cosas que no usás.",
    "- No regatees ni inventes descuentos ni plazos.",
    "",
    "LO QUE NO HACÉS NUNCA",
    "- No inventes productos, códigos, precios, plazos ni condiciones: todo número sale de las herramientas. Si algo no está, decilo simple y ofrecé lo más parecido.",
    "- No digas que un producto cura, trata, previene ni mejora ninguna condición de salud. No nombres enfermedades. No des cantidades a consumir ni armes dietas.",
    "- No inventes testimonios, certificaciones ni cantidades de clientes.",
    "- No pidas DNI, dirección, teléfono ni mail: eso se carga al pagar.",
    "- Si pregunta por un pedido ya hecho, hay un reclamo o pide hablar con una persona, usá pasar_a_whatsapp.",
    "",
    "FORMATO",
    "- Texto plano, sin markdown, sin asteriscos y sin links: los productos que buscaste y el pedido armado se le muestran solos con botones debajo de tu texto. No los repitas uno por uno.",
    "- Terminá SIEMPRE con una última línea así: OPCIONES: opción 1 | opción 2 | opción 3",
    "  Son hasta 3 respuestas que la persona tocaría como botón, escritas como las diría ella, de hasta 20 caracteres cada una. Ejemplos: «Quiero la Despensa», «Para un negocio», «Ver otros combos», «Sí, agregalo», «Nada más, gracias».",
  ].join("\n");
}

type Bloque = { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> };

function contexto(carrito: CarritoVisto | null): string {
  if (!carrito || !carrito.renglones.length) return "";
  return [
    "<carrito>",
    ...carrito.renglones.map((l) => `${l.cantidad} x ${l.nombre} · ${pesos(l.subtotal)}`),
    `Subtotal ${pesos(carrito.subtotal)} de ${pesos(carrito.compraMinima)} de compra mínima.`,
    carrito.falta > 0 ? `Le faltan ${pesos(carrito.falta)} para poder pagar.` : "Ya llega al mínimo y puede pagar.",
    "</carrito>",
  ].join("\n");
}

export async function responderComoVendedor(
  mensaje: string,
  historial: Turno[] = [],
  carrito: CarritoVisto | null = null,
  canal: Canal = "web",
  ctx: Contexto = {},
): Promise<Respuesta | null> {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return null;

  const cfg = await leerConfig();
  // El carrito va pegado al mensaje y no en las instrucciones: así las instrucciones
  // y las herramientas no cambian nunca y el caché del prompt sirve de verdad.
  const carritoTxt = contexto(carrito);
  const mensajes: { role: "user" | "assistant"; content: unknown }[] = [
    ...historial.slice(-8).map((t) => ({ role: (t.de === "yo" ? "user" : "assistant") as "user" | "assistant", content: t.texto })),
    { role: "user" as const, content: carritoTxt ? `${carritoTxt}\n\n${mensaje}` : mensaje },
  ];

  let fichas: Ficha[] = [];
  let acciones: Accion[] = [];
  let enlaces: Enlace[] = [];
  let derivar = false;
  let envio: EnvioCotizado | undefined;
  let entregaGuardada = false;
  try {
    for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: MODELO,
          // Las respuestas son de tres frases: un techo bajo corta las que se van de largo.
          max_tokens: 500,
          // El cache_control al final del system cubre las herramientas y las instrucciones:
          // son el 90% de lo que se manda y no cambian entre mensajes.
          system: [{ type: "text", text: instrucciones(pesos(cfg.compraMinima)), cache_control: { type: "ephemeral" } }],
          tools: HERRAMIENTAS,
          // En la última vuelta ya no puede pedir más herramientas: tiene que contestar con lo que tiene.
          // Antes, si se quedaba sin vueltas, devolvía null y contestaba el buscador viejo.
          ...(vuelta === MAX_VUELTAS - 1 ? { tool_choice: { type: "none" } } : {}),
          messages: mensajes,
        }),
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) {
        console.error("vendedor: la API rechazó", res.status, (await res.text()).slice(0, 300));
        return null;
      }
      const data = (await res.json()) as { content?: Bloque[]; stop_reason?: string };
      let bloques = data.content ?? [];
      // Una respuesta cortada («No hace fal») no sale nunca: se descarta el texto y se le pide de nuevo.
      if (data.stop_reason === "max_tokens") {
        console.error("vendedor: respuesta cortada por largo", { vuelta });
        bloques = bloques.filter((b) => b.type !== "text");
      } else if (cortada(bloques.filter((b) => b.type === "text").map((b) => b.text ?? "").join(""))) {
        console.error("vendedor: respuesta que parece cortada", { vuelta, stop: data.stop_reason });
        bloques = bloques.filter((b) => b.type !== "text");
      }
      mensajes.push({ role: "assistant", content: bloques });

      const usos = bloques.filter((b) => b.type === "tool_use");
      if (!usos.length) {
        const crudo = bloques.filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
        const sep = separarOpciones(crudo);
        const opciones = sep.opciones;
        let texto = sep.texto;
        if (!texto) {
          // A veces contesta solo con la línea de OPCIONES. Si ya buscó productos, alcanza con una
          // frase corta: la lista con precios va debajo. Si no, se le pide de nuevo el texto.
          console.error("vendedor: respuesta sin texto", { vuelta, conFichas: fichas.length });
          if (vuelta < MAX_VUELTAS - 1) {
            if (!bloques.length) mensajes.pop();
            mensajes.push({ role: "user", content: "(Escribile la respuesta al cliente: dos o tres frases cortas, nombrando lo que le recomendás, y al final la línea OPCIONES.)" });
            continue;
          }
          if (!fichas.length) return null;
          texto = "Mirá, acá tenés las opciones con precio 👇";
        }
        const mostradas = sep.texto ? fichasNombradas(fichas, texto) : fichas.slice(0, 4);
        return {
          texto,
          opciones: opciones.length ? opciones : undefined,
          fichas: mostradas.length ? mostradas : undefined,
          acciones: acciones.length ? acciones : undefined,
          enlaces: enlaces.length ? enlaces : undefined,
          derivar: derivar || undefined,
          envio,
          entregaGuardada: entregaGuardada || undefined,
        };
      }

      const resultados = [];
      for (const u of usos) {
        const r = await correrHerramienta(u.name ?? "", u.input ?? {}, canal, ctx);
        if (r.entregaGuardada) entregaGuardada = true;
        if (r.fichas?.length) fichas = [...r.fichas, ...fichas.filter((f) => !r.fichas!.some((n) => n.href === f.href))].slice(0, 8);
        if (r.acciones?.length) acciones = r.acciones;
        if (r.enlaces?.length) enlaces = r.enlaces;
        if (r.derivar) derivar = true;
        if (r.envio) envio = r.envio;
        resultados.push({ type: "tool_result", tool_use_id: u.id, content: r.texto });
      }
      mensajes.push({ role: "user", content: resultados });
    }
  } catch (e) {
    console.error("vendedor: falló", e);
    return null;
  }
  console.error("vendedor: se quedó sin vueltas");
  return null;
}
