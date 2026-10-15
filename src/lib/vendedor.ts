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
import { catalogo, hallarProductos } from "./asistente-catalogo";
import { combosTienda } from "./tienda";
import { ofertasDelProveedor } from "./ofertas";
import { pesos, renglonCombo } from "./precios";
import { zonaPagaDe } from "./envios/tabla";
import { linkWhatsapp } from "./pedidos";
import { NICHOS } from "./taxonomia";
import type { Accion, Enlace, Ficha, Respuesta } from "./asistente-catalogo";

export type Turno = { de: "yo" | "acopio"; texto: string };

/** Lo que la persona tiene en el carrito ahora, ya cotizado por el servidor. */
export type CarritoVisto = {
  renglones: { nombre: string; cantidad: number; subtotal: number }[];
  subtotal: number;
  falta: number;
  compraMinima: number;
};

const MODELO = process.env.VENDEDOR_MODELO || "claude-haiku-5-5";
const MAX_VUELTAS = 4;

export function vendedorActivo(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const HERRAMIENTAS = [
  {
    name: "buscar_productos",
    description:
      "Busca productos en el catálogo real de la tienda y devuelve código, nombre, presentación, precio y si es sin TACC. " +
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
      "Usala siempre que la persona acepte una sugerencia o diga que quiere algo.",
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

type Salida = { texto: string; fichas?: Ficha[]; acciones?: Accion[]; enlaces?: Enlace[] };

/** Exportada para poder probar cada herramienta sin pegarle a la API ni gastar tokens. */
export async function correrHerramienta(nombre: string, entrada: Record<string, unknown>): Promise<Salida> {
  if (nombre === "buscar_productos") {
    const consulta = String(entrada.consulta ?? "");
    const productos = (await hallarProductos(consulta, entrada.solo_sin_tacc === true)).slice(0, 6);
    if (!productos.length) return { texto: `Sin resultados para «${consulta}». No ofrezcas este producto: no lo tenemos.` };
    const fichas: Ficha[] = productos.slice(0, 4).map((p) => ({
      href: `/producto/${encodeURIComponent(p.codigo)}`,
      nombre: p.producto,
      detalle: [p.marca.startsWith("Sin marca") ? "" : p.marca, p.presentacion].filter(Boolean).join(" · "),
      precio: pesos(p.precio),
      foto: p.fotoUrl,
    }));
    // El código va primero porque es lo que necesita para agregar_al_pedido.
    const texto = productos
      .map((p) => `- codigo ${p.codigo} · ${p.producto} · ${p.presentacion} · ${pesos(p.precio)}${p.sinTacc ? " · sin TACC" : ""}${p.esSuplemento ? " · suplemento" : ""}`)
      .join("\n");
    return { texto, fichas };
  }

  if (nombre === "ver_combos") {
    const cfg = await leerConfig();
    const combos = (await combosTienda({ activo: true, tipo: "COMBO" })).filter((c) => c.disponible).slice(0, 8);
    if (!combos.length) return { texto: "No hay combos disponibles ahora." };
    const fichas: Ficha[] = combos.slice(0, 3).map((c) => ({
      href: `/combos/${c.slug}`,
      nombre: `Combo ${c.nombre}`,
      detalle: `Trae: ${c.items.map(({ producto, cantidad }) => renglonCombo(producto, cantidad)).join(" · ")}`,
      precio: pesos(Math.round(c.precio)),
      foto: c.fotoUrl,
    }));
    const texto = combos
      .map((c) => `- slug ${c.slug} · ${c.nombre} · ${pesos(Math.round(c.precio))}${c.precio >= cfg.compraMinima ? " · llega solo a la compra mínima" : ""}`)
      .join("\n");
    return { texto, fichas };
  }

  if (nombre === "datos_de_la_tienda") {
    const cfg = await leerConfig();
    const zp = cfg.entregaPropiaActiva ? zonaPagaDe(cfg.tabla) : null;
    const partes = [
      `Compra mínima: ${pesos(cfg.compraMinima)} por pedido, combinando lo que quiera.`,
      cfg.entregaPropiaActiva
        ? `Entrega propia sin cargo en Villa Carlos Paz y el sur de Punilla (San Antonio de Arredondo, Mayu Sumaj, Icho Cruz, Cuesta Blanca) en ${cfg.plazoEntregaPropia}. Los domingos no se entrega.${zp ? ` A ${zp.nombre} también, por ${pesos(zp.precio)}.` : ""}`
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
        `Listo: le aparecen los botones para sumar ${acciones.map((a) => `${a.cantidad} x ${a.nombre} (${a.precio})`).join(", ")}. Suma ${pesos(total)}.`,
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
    const cfg = await leerConfig();
    const resumen = String(entrada.resumen ?? "").trim().slice(0, 400);
    const href = cfg.whatsapp ? linkWhatsapp(cfg.whatsapp, `Hola! ${resumen || "Tengo una consulta sobre Acopio Saludable."}`) : null;
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
    "Sos el vendedor de Acopio Saludable, una tienda online de productos saludables a granel y sin TACC con base en Villa Carlos Paz, Córdoba. Atendés el chat de la web.",
    "",
    "CÓMO HABLÁS",
    "- Español rioplatense, de vos. Natural, como un vendedor de mostrador que sabe lo que vende.",
    "- Corto: dos o tres frases y una sola pregunta. Nunca listas largas ni párrafos.",
    "- No saludes de nuevo si ya venías hablando. No repitas lo que ya dijiste.",
    "",
    "CÓMO VENDÉS",
    "- Entendé para qué es: para la casa o para un negocio (kiosco, hotel, cabañas, dietética, gimnasio, cafetería, rotisería, oficina). Preguntalo una sola vez, y solo si cambia lo que le vas a ofrecer.",
    "- Si es para un negocio, mostrale el pedido armado de su rubro con pedido_para_negocio y hablale de reventa: el catálogo trae precio sugerido y cuánto gana por unidad.",
    `- La compra mínima es ${compraMinima}. Si el carrito no llega, usá completar_el_minimo y ofrecé algo concreto con su precio. Nunca lo dejes en «te falta plata».`,
    "- Cuando acepta algo, agregalo con agregar_al_pedido en el mismo mensaje. No le pidas que lo busque él.",
    "- Cerrá siempre con un paso concreto y uno solo: agregar esto, ver el carrito, seguir por WhatsApp.",
    "- Si duda por el precio, nombrá el descuento por transferencia o una baja real de ver_ofertas. Nada más.",
    "- No regatees ni inventes descuentos ni plazos: los únicos que existen son los que te dan las herramientas.",
    "",
    "LO QUE NO HACÉS NUNCA",
    "- No inventes productos, códigos, precios, plazos ni condiciones. Todo número sale de las herramientas. Si no aparece, decí que no lo tenemos y ofrecé una alternativa que sí esté.",
    "- No digas que un producto cura, trata, previene ni mejora ninguna condición de salud. No nombres enfermedades. Si preguntan eso, decí que no das indicaciones de salud y que consulten a su médico o nutricionista.",
    "- No prometas resultados físicos, de rendimiento ni de peso. No des cantidades a consumir ni armes dietas.",
    "- No inventes testimonios, certificaciones ni cantidades de clientes.",
    "- No pidas datos personales: ni DNI, ni dirección, ni teléfono, ni mail. Los datos se cargan en el checkout.",
    "- Si preguntan por un pedido ya hecho, hay un reclamo, o te piden algo que no sabés, usá pasar_a_whatsapp.",
    "",
    "FORMATO DE LA RESPUESTA",
    "- Texto plano, sin markdown, sin asteriscos, sin encabezados, sin emojis.",
    "- Los productos que buscaste se le muestran aparte en tarjetas con foto y precio, y lo que agregás aparece como botón: no repitas la lista entera, nombrá uno o dos y seguí.",
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
): Promise<Respuesta | null> {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return null;

  const cfg = await leerConfig();
  // El carrito va pegado al mensaje y no en las instrucciones: así las instrucciones
  // y las herramientas no cambian nunca y el caché del prompt sirve de verdad.
  const ctx = contexto(carrito);
  const mensajes: { role: "user" | "assistant"; content: unknown }[] = [
    ...historial.slice(-8).map((t) => ({ role: (t.de === "yo" ? "user" : "assistant") as "user" | "assistant", content: t.texto })),
    { role: "user" as const, content: ctx ? `${ctx}\n\n${mensaje}` : mensaje },
  ];

  let fichas: Ficha[] = [];
  let acciones: Accion[] = [];
  let enlaces: Enlace[] = [];
  try {
    for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: MODELO,
          max_tokens: 600,
          // El cache_control al final del system cubre las herramientas y las instrucciones:
          // son el 90% de lo que se manda y no cambian entre mensajes.
          system: [{ type: "text", text: instrucciones(pesos(cfg.compraMinima)), cache_control: { type: "ephemeral" } }],
          tools: HERRAMIENTAS,
          messages: mensajes,
        }),
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { content?: Bloque[] };
      const bloques = data.content ?? [];
      mensajes.push({ role: "assistant", content: bloques });

      const usos = bloques.filter((b) => b.type === "tool_use");
      if (!usos.length) {
        const texto = bloques.filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
        if (!texto) return null;
        return {
          texto,
          fichas: fichas.length ? fichas : undefined,
          acciones: acciones.length ? acciones : undefined,
          enlaces: enlaces.length ? enlaces : undefined,
        };
      }

      const resultados = [];
      for (const u of usos) {
        const r = await correrHerramienta(u.name ?? "", u.input ?? {});
        if (r.fichas?.length) fichas = r.fichas;
        if (r.acciones?.length) acciones = r.acciones;
        if (r.enlaces?.length) enlaces = r.enlaces;
        resultados.push({ type: "tool_result", tool_use_id: u.id, content: r.texto });
      }
      mensajes.push({ role: "user", content: resultados });
    }
  } catch {
    return null;
  }
  return null;
}
