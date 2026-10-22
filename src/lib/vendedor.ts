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

import { bloqueLeccionesVendedor } from "./organico";
import { leerConfig } from "./config";
import { SALUDO_GENERAL } from "./whatsapp-saludo";
import { catalogo, hallarCombos, hallarProductos } from "./asistente-catalogo";
import { combosTienda, productosTienda } from "./tienda";
import { ofertasDelProveedor } from "./ofertas";
import { cuantoTrae, pesos, renglonCombo } from "./precios";
import { zonaPagaDe } from "./envios/tabla";
import { linkWhatsapp } from "./pedidos";
import { NICHOS } from "./taxonomia";
import { cortada, fichasNombradas, presentacionDe, separarOpciones } from "./whatsapp-interactivo";
import { argumentoCombo, COMBO_ENTRADA, temaDe } from "./combos-tema";
import type { Accion, Enlace, EnvioCotizado, Ficha, Foto, Respuesta } from "./asistente-catalogo";
import { urlSitio } from "./sitio";

/** Meta necesita una URL pública absoluta para la foto. */
const absoluta = (u: string) => (u.startsWith("http") ? u : `${urlSitio()}${u.startsWith("/") ? "" : "/"}${u}`);
import { cotizarEnvioChat } from "./envio-chat";
import { EN_STOCK, productosDe, sugerirDelStock } from "./en-stock";
import { fotoRealDe, fotosReales, imagenCombo, imagenProducto, pideFotosReales } from "./galeria";
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
    name: "mandar_fotos",
    description:
      "Manda por el chat las imágenes (hasta 4) de los productos o combos que pide ver, con nombre y precio al pie. Si pregunta cómo llega, cómo lo arman o el empaque, pasale consulta «cómo llega» y van fotos reales del pedido armado. " +
      "Usala cuando pida fotos, imágenes o «ver cómo es»: pasale la búsqueda o los códigos/slugs de lo que estaban hablando.",
    input_schema: {
      type: "object" as const,
      properties: {
        consulta: { type: "string", description: "Qué fotos busca, por ejemplo «barritas proteicas» o «mix clásico»." },
        codigos: { type: "array", items: { type: "string" }, description: "Códigos de productos o slugs de combos ya nombrados en la charla (hasta 4)." },
      },
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
        lugar: { type: "string", description: "Barrio o ciudad, como lo dijo: «Nueva Córdoba», «Carlos Paz», «Rosario». Si dijo ciudad y barrio («Carlos Paz, barrio El Fantasío»), pasá los dos juntos." },
        provincia: { type: "string", description: "Opcional: la provincia, si la dijo o es obvia." },
        kilos: { type: "number", description: "Kilos del pedido: sumá lo que pidió (la Despensa son 4, la Alacena 3, un producto de 1 kg es 1). Si todavía no eligió nada, 4." },
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
      "Usala siempre que la persona acepte una sugerencia o elija algo. Lo que mandes se SUMA a lo que ya tenía en el pedido; " +
      "si quita o cambia algo («sacá las pasas», «en vez de X, Y»), mandá el pedido completo como queda y reemplazar: true.",
    input_schema: {
      type: "object" as const,
      properties: {
        reemplazar: { type: "boolean", description: "true solo si el pedido se arma de nuevo (quitó o cambió algo). Si no, lo nuevo se suma a lo guardado." },
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
    name: "ver_stock",
    description:
      "Lo que tenemos en mano ahora (recién llegado), con código y precio, elegido para que combine con lo que lleva. " +
      "Usala para la venta adicional, SOLO cuando ya está cerrado lo que vino a buscar (pedido armado y zona o pago resueltos), o si pregunta «¿qué más tienen?».",
    input_schema: {
      type: "object" as const,
      properties: {
        lleva: { type: "string", description: "Lo que lleva o vino a buscar, con lo que trae el combo si es un combo (ej. «Despensa: mix, dátiles, pasas, semillas»)." },
        solo_sin_tacc: { type: "boolean", description: "true si busca sin TACC." },
      },
      required: ["lleva"],
    },
  },
  {
    name: "pedido_para_negocio",
    description:
      "Devuelve los productos del pedido sugerido de un rubro, con precio y reventa (hotelería y cabañas, gimnasios, dietéticas, cafeterías, rotiserías, kioscos, oficinas, familias). " +
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
      "Usala solo cuando: pregunta por un pedido ya hecho, " +
      "hay un reclamo, o pide algo que de verdad no está en el catálogo. NUNCA la uses para: la lista de precios, un mix o pedido a medida, reservar hasta que cobre, un descuento, o «hablar con alguien» para negociar. Todo eso lo cerrás vos en la charla.",
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

type Salida = { texto: string; fichas?: Ficha[]; acciones?: Accion[]; enlaces?: Enlace[]; derivar?: boolean; envio?: EnvioCotizado; entregaGuardada?: boolean; fotos?: Foto[]; reemplazaPedido?: boolean };

/** Exportada para poder probar cada herramienta sin pegarle a la API ni gastar tokens. */
/** Lo que el vendedor sabe de la charla además del texto: por ahora, el pedido ya cerrado. */
export type Contexto = { ordenId?: number };

export async function correrHerramienta(nombre: string, entrada: Record<string, unknown>, canal: Canal = "web", ctx: Contexto = {}): Promise<Salida> {
  if (nombre === "datos_de_entrega") {
    if (!ctx.ordenId) return { texto: "No hay un pedido cerrado en esta charla: no hay dónde guardar los datos." };
    const s = (k: string) => (typeof entrada[k] === "string" ? String(entrada[k]).trim() : "");
    const pedido = await completarEntrega(ctx.ordenId, { nombre: s("nombre"), direccion: s("direccion"), referencia: s("referencia"), horario: s("horario") });
    if (!pedido) return { texto: "No encontré el pedido. Decile que le escribimos para coordinar." };
    const falta = [!s("direccion") && "la dirección", !s("horario") && "el horario"].filter(Boolean);
    return {
      texto: falta.length
        ? `Guardado. Falta ${falta.join(" y ")}: pedíselo en una frase.`
        : "Guardado en el pedido. Agradecé en una frase y decile que su pedido quedó agendado y le confirmamos la entrega por acá. No pidas nada más ni ofrezcas otra cosa.",
      entregaGuardada: falta.length === 0,
    };
  }
  if (nombre === "mandar_fotos") {
    const consulta = String(entrada.consulta ?? "").trim();
    const codigos = Array.isArray(entrada.codigos) ? entrada.codigos.map(String).slice(0, 4) : [];
    const [porCodigo, combosTodos] = await Promise.all([codigos.length ? productosTienda({ where: { codigo: { in: codigos } } }) : Promise.resolve([]), combosTienda({ activo: true })]);
    const combosPedidos = combosTodos.filter((c) => codigos.includes(c.slug));
    const buscados = consulta && !pideFotosReales(consulta) && porCodigo.length + combosPedidos.length < 1 ? await hallarProductos(consulta, false).then((x) => x.slice(0, 4)) : [];
    const combosBuscados = consulta && !pideFotosReales(consulta) && !combosPedidos.length && !porCodigo.length ? await hallarCombos(consulta).then((x) => x.slice(0, 2)) : [];
    // Las imágenes con diseño propio (galería) mandan; si no hay, la foto de la tienda.
    const reales = pideFotosReales(consulta) ? fotosReales().map((f) => ({ url: absoluta(f.url), pie: f.pie })) : [];
    // La foto real de la mercadería en nuestra mesa va primero: es lo que pide quien quiere «ver cómo es».
    const realProducto = [consulta, ...porCodigo.map((p) => `${p.producto} ${p.presentacion}`)].map((t) => fotoRealDe(t)).find(Boolean);
    const fotos: Foto[] = [
      ...reales,
      ...(realProducto ? [{ url: absoluta(realProducto.url), pie: `Foto real · ${realProducto.pie}` }] : []),
      ...combosPedidos.concat(combosBuscados).filter((c) => imagenCombo(c.slug) || c.fotoUrl).map((c) => ({ url: absoluta(imagenCombo(c.slug) ?? c.fotoUrl!), pie: `${c.nombre} · ${pesos(Math.round(c.precio))}` })),
      ...porCodigo.concat(buscados).filter((p) => imagenProducto(p.codigo) || p.fotoUrl).map((p) => ({ url: absoluta(imagenProducto(p.codigo) ?? p.fotoUrl!), pie: `${p.producto} ${p.presentacion} · ${pesos(p.precio)}` })),
    ].filter((f, i, a) => a.findIndex((o) => o.url === f.url) === i).slice(0, 4);
    if (!fotos.length) return { texto: "No hay fotos cargadas de eso. Decile que las ve en la web (acopiosaludable.com/catalogo) y seguí con la venta." };
    return { texto: `Se mandan ${fotos.length} fotos: ${fotos.map((f) => f.pie).join("; ")}. Escribí una frase corta («Te paso las fotos») y seguí con la pregunta de cierre.`, fotos };
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
    const envio = lugar ? await cotizarEnvioChat(lugar, entrada.provincia ? String(entrada.provincia) : null, Number(entrada.subtotal) || 0, Number(entrada.kilos) || 4) : null;
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
      `${c.precio >= cfg.compraMinima ? " · llega solo a la compra mínima" : ""} · trae ${c.items.length} productos: ${c.items.slice(0, 6).map((i) => cuantoTrae(i)).join(", ")}${c.items.length > 6 ? "…" : ""}${cantidadCombo(c)}`;
    const texto = [
      tema ? `Tema detectado: ${tema.nombre}.` : "No hay un combo específico para eso.",
      ...elegidos.map((c, i) => lineas(c, i === 0 ? "RECOMENDADO" : "alternativa")),
      entrada_ && !elegidos.some((c) => c.slug === entrada_.slug) ? lineas(entrada_, "entrada más barata (ofrecela solo si el recomendado le parece caro)") : "",
      esSinTacc
        ? "Busca SIN TACC: todo lo que ofrezcas tiene que ser sin TACC. Si el combo le parece caro, no ofrezcas la Despensa: armale algo a medida con buscar_productos (solo_sin_tacc: true) o completar_el_minimo que llegue al mínimo."
        : "",
      elegidos.length
        ? "Ofrecé el RECOMENDADO en dos frases cortas, vendiendo: qué trae en cantidad concreta («un kilo de cada uno», «te dura todo el mes»), el precio y el de transferencia, y la pregunta. No enumeres de más ni expliques: «La Alacena te trae un kilo de nuez, un kilo de mix con cajú y uno de pasas: te dura todo el mes. $43.247, o $39.787 por transferencia, y te llega sin cargo. ¿Te la separo?». Si pidió un producto puntual, decí también su precio suelto en media frase."
        : "Ofrecé el producto que pidió (buscalo con buscar_productos) y, para llegar al mínimo, la entrada más barata.",
    ].filter(Boolean).join("\n");
    const fichas: Ficha[] = elegidos.map((c) => ({
      href: `/combos/${c.slug}`,
      nombre: `Combo ${c.nombre}`,
      detalle: `Trae: ${c.items.map(({ producto, cantidad }) => renglonCombo(producto, cantidad)).join(" · ")}`,
      precio: pesos(Math.round(c.precio)),
      foto: c.fotoUrl,
    }));
    // Por WhatsApp, el combo recomendado va con su imagen: la foto vende más que el texto.
    const imagen = canal === "whatsapp" && elegidos[0] ? imagenCombo(elegidos[0].slug) : null;
    if (imagen) return { texto: `${texto}\nLa imagen del ${elegidos[0].nombre} sale sola antes de tu texto: no la anuncies.`, fichas, fotos: [{ url: absoluta(imagen), pie: elegidos[0].nombre }] };
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
      `Compra mínima: ${pesos(cfg.compraMinima)} por pedido, combinando lo que quiera.${cfg.entregaPropiaActiva && cfg.compraMinimaPropia < cfg.compraMinima ? ` En Villa Carlos Paz y el sur de Punilla (reparto propio) el mínimo es ${pesos(cfg.compraMinimaPropia)}.` : ""}`,
      cfg.entregaPropiaActiva
        ? `Entrega propia sin cargo en Villa Carlos Paz y todo lo cercano: Estancia Vieja, Santa Cruz del Lago, Villa Parque Siquiman, Villa del Lago, San Roque, Bialet Massé, Tanti, Cabalango y el sur de Punilla (San Antonio de Arredondo, Mayu Sumaj, Icho Cruz, Cuesta Blanca, Tala Huasi) en ${cfg.plazoEntregaPropia}. Los domingos no se entrega.${zp ? ` A ${zp.nombre} también, por ${pesos(zp.precio)}.` : ""}`
        : "",
      "Al resto del país, por correo: despacho en 24 a 48 hs hábiles y de 2 a 7 días hábiles según zona. El costo se ve en el carrito con el código postal, antes de pagar.",
      cfg.envioGratisDesde ? `Envío gratis desde ${pesos(cfg.envioGratisDesde)}.` : "",
      `Pago: Mercado Pago (crédito, débito o dinero en cuenta) o transferencia.${cfg.descuentoTransferenciaPct > 0 ? ` Por transferencia hay ${cfg.descuentoTransferenciaPct}% de descuento.` : ""}`,
      "Los combos tienen 5% de descuento sobre el precio de lista.",
      "Los congelados solo se entregan en la zona de reparto propio: no van por correo.",
      "Atención por WhatsApp de lunes a sábado, de 8 a 20 h.",
      "Cada pedido se prepara a medida, fraccionado y rotulado en el momento.",
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

  if (nombre === "ver_stock") {
    const lleva = String(entrada.lleva ?? "").slice(0, 300);
    const sugeridas = sugerirDelStock(lleva, await catalogo(), 2, entrada.solo_sin_tacc === true);
    if (!sugeridas.length) return { texto: "No hay nada en stock que combine con lo que lleva. No ofrezcas nada más: cerrá cálido." };
    return {
      texto: [
        "En stock, para sumar (va en el mismo envío):",
        ...sugeridas.map(({ item, producto: p }) => `- codigo ${p.codigo} · ${p.producto} ${p.presentacion} · ${pesos(p.precio)} · ${item.gancho}`),
        "Ofrecé UNA sola, la que más combine, en una frase con su precio y un porqué concreto («ya que va el reparto…», «para acompañar la granola…»), y preguntá si se la sumás. Si dice que sí, agregar_al_pedido. Si dice que no o no contesta eso, no insistas.",
      ].join("\n"),
    };
  }

  if (nombre === "completar_el_minimo") {
    const falta = Math.max(0, Math.round(Number(entrada.falta) || 0));
    if (!falta) return { texto: "Ya llega a la compra mínima: no hace falta completar nada. Cerrá la venta." };
    const afin = String(entrada.afin_a ?? "").trim();
    const todos = await catalogo();
    const enMano = new Set(EN_STOCK.flatMap((i) => productosDe(i, todos).map((p) => p.codigo)));
    // Lo que sirve es lo que cierra el hueco de una, no lo más caro ni lo más barato del catálogo.
    const cerca = todos
      .filter((p) => p.precio >= falta * 0.45 && p.precio <= falta * 1.6)
      // Lo que tenemos en mano va primero: sale hoy y rota el stock.
      .map((p) => ({ p, d: Math.abs(p.precio - falta) * (enMano.has(p.codigo) ? 0.5 : 1) }))
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
      reemplazaPedido: entrada.reemplazar === true,
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
    // Los productos del pedido sugerido, con precio y reventa: se le muestran en el chat, no un link.
    const [pedido] = await combosTienda({ tipo: "PEDIDO_NICHO", nicho: id, activo: true });
    const items = (pedido?.items ?? []).filter((i) => i.producto.precio > 0).slice(0, 6);
    if (!items.length) {
      const sueltos = await productosTienda({ where: { nichos: { has: id } }, take: 6 });
      items.push(...sueltos.map((producto) => ({ producto, cantidad: 1 })));
    }
    const lineas = items.map(({ producto: p, cantidad }) => {
      const gana = p.sugerido ? ` · lo vende a ${pesos(p.sugerido)} y gana ${pesos(p.sugerido - p.precio)}` : "";
      return `- [${p.codigo}] ${cantidad} × ${p.producto} ${p.presentacion}: ${pesos(p.precio)}${gana}`;
    });
    const total = items.reduce((t, i) => t + i.producto.precio * i.cantidad, 0);
    return {
      texto: [
        `Pedido típico para ${nicho.nombre} (precios de hoy, con el precio de reventa sugerido):`,
        ...lineas,
        `Total de este pedido: ${pesos(total)}.`,
        "Mostrale 3 o 4 de estos productos EN EL MENSAJE, cada uno en su renglón con precio y cuánto gana revendiéndolo, y cerrá con UNA pregunta («¿Te armo este pedido?» o «¿Qué le sumarías?»). No mandes links ni la página del rubro. Si dice que sí, usá agregar_al_pedido con esos códigos.",
      ].join("\n"),
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

function instrucciones(compraMinima: string, lecciones = ""): string {
  return [
    "Sos del equipo de ventas de Acopio Saludable, una distribuidora de alimentos saludables (frutos secos, semillas, granolas y sin TACC) de Villa Carlos Paz, Córdoba, con envíos a todo el país. Atendés el chat de la web, WhatsApp, Messenger e Instagram.",
    "La persona tiene que sentir que le escribe alguien de verdad que sabe del tema y la quiere ayudar, no un sistema.",
    "Tu actitud: estás para ayudarlo a resolver la compra rápido. Hablá como una distribuidora grande y ordenada, en plural («preparamos», «enviamos», «tenemos»), nunca en primera persona del singular. Nunca digas «yo te lo armo», «te lo llevo yo», «yo me encargo» ni «te armo todo el pedido». La idea que tiene que quedar: le ahorramos tiempo, encarga todo por acá y le llega a su casa, sin ir a la dietética. Decilo con naturalidad una vez en la charla, no en cada mensaje.",
    "",
    "CÓMO HABLÁS",
    "- Rioplatense, de vos, cálido y natural, como por WhatsApp con un cliente de confianza. Frases cortas, nada de lenguaje de sistema.",
    "- Nunca digas «encontré N opciones», «según el catálogo», «no coincide con el anuncio», «soy un asistente» ni nada que suene a robot.",
    "- DE A POCO: la gente por WhatsApp no lee bloques. Un mensaje = un dato importante + una pregunta. Máximo 30 palabras; el primer mensaje de la charla, 25. Lo demás (el combo, el precio por transferencia, el envío) va en el mensaje siguiente, cuando contesta. Si mandás todo junto, no responde.",
    "- TERMINÁ SIEMPRE CON UNA PREGUNTA fácil, que se conteste con una palabra o un toque: «¿Para tu casa o para un negocio?», «¿De qué ciudad sos? Así te digo el envío», «¿Te la separo?», «¿Cuál te gusta más?». Sin pregunta la charla muere (de 70 primeras respuestas, solo 2 terminaban en pregunta). Nunca dos preguntas juntas.",
    "  Ejemplo primer mensaje: «¡Hola Quique! El maní saborizado sale $X el kilo y el mix con cajú $Y. ¿Para tu casa o para un negocio?»",
    "- Si pregunta un precio: el precio de UNA presentación y el combo que lo trae. Las otras presentaciones y opciones van solas en los botones de abajo: no las escribas.",
    "  Ejemplo: «Nueces x kg» → «La nuez mariposa sale $X el kilo. Si querés variedad, la Alacena de frutos secos trae nuez, mix con cajú y pasas por $Y. ¿Te la separo?» (precios siempre de las herramientas) con OPCIONES: Quiero el combo | Solo las nueces | Ver qué trae",
    "- Nunca listas con guiones ni viñetas. Saludá solo en el primer mensaje, sin presentarte de nuevo después.",
    "- PRECIOS SIEMPRE DE HOY Y REDONDOS: cada precio que digas sale de las herramientas de este turno (buscar_productos, recomendar_combo), nunca copiado de mensajes anteriores de la charla, que pueden haber cambiado. Decilos tal cual vienen («$25.000»), sin inventar cifras con decimales ni restar porcentajes vos: el precio por transferencia también viene de la herramienta.",
    "- Como mucho un emoji y solo si suma.",
    "- Nunca uses la palabra «perfecto» (suena a robot). Usá «dale», «buenísimo», «listo» o directamente seguí con lo que viene.",
    "",
    "CÓMO VENDÉS: COMBO PRIMERO",
    "1. Apenas dice qué busca (un producto, una categoría, «sin tacc», «para el desayuno»), usá recomendar_combo y ofrecé el RECOMENDADO: nombre, precio, qué trae y la pregunta. Cuando digas qué trae, decí SIEMPRE la cantidad de cada cosa, como viene en la herramienta («1 kg de mix, 1 kg de dátiles, 1 kg de pasas y 1 kg de semillas»), nunca «1 kilo de mix, dátiles, pasas y semillas»: se entiende que es un kilo en total. El precio por transferencia y el resto de lo que trae, cuando pregunte o en el mensaje siguiente. Si pidió un producto puntual, dale primero su precio suelto.",
    "   El argumento es siempre el mismo y es verdad: el combo resuelve la compra del mes, tiene 5% menos que comprando suelto y llega solo a la compra mínima, así no tiene que andar sumando.",
    "   Ejemplo: «Busco productos sin tacc» → «Para sin TACC te conviene la Caja Sin TACC del mes: trae alfajores, barritas, pasta de maní y miel por $66.778, y por transferencia te queda en $61.436. ¿Te la separo?»",
    "2. Si dice que es caro, que es mucho o duda: bajá un escalón, al combo de entrada (la Despensa de 4 kilos; en Villa Carlos Paz y el sur de Punilla, la Despensa chica de 2 kilos; nunca si busca sin TACC), o armale algo a medida que llegue justo al mínimo con completar_el_minimo. Nunca discutas el precio.",
    "3. Si insiste con un producto suelto, vendéselo: buscalo con buscar_productos, dale el precio y, si no llega al mínimo, ofrecé completar con algo concreto (completar_el_minimo).",
    "4. Cuando acepta («sí», «dale», «lo quiero», toca un producto), agregalo con agregar_al_pedido en ese mismo mensaje y, si todavía no sabés dónde vive, decile que ya se lo armaste y preguntale su barrio o ciudad para decirle el envío. Abajo le aparecen botones con las zonas.",
    "   Cuando te dice la zona, usá costo_envio y decile el envío en una frase: ahí recién le aparecen los botones para pagar. No vuelvas a agregar el pedido.",
    "   Si en vez de la zona te pasa directamente la dirección (calle y número), NO le preguntes el barrio ni la ciudad: usá costo_envio con la ciudad que diga, y si no dice ninguna, con «Villa Carlos Paz». Nunca le pidas un dato que ya te dio: releé la charla antes de preguntar.",
    "   Si dice «pago aquí», «pago cuando me lo traés» o «al recibir» y es de Carlos Paz y alrededores, ya eligió pagar al recibir: no ofrezcas otra forma de pago ni preguntes nada más.",
    "   PAGAR AL RECIBIR ES SOLO EN CARLOS PAZ Y ALREDEDORES (la zona con envío sin cargo). En Córdoba capital y en envíos por correo se paga antes de salir: si pide pagar al recibir, decile amable que para su zona se abona antes, por transferencia (con descuento) o Mercado Pago, y que apenas se acredita sale el pedido. Nunca le ofrezcas pagar al recibir fuera de Carlos Paz.",
    "5. VENTA ADICIONAL, como un vendedor experto: primero se cierra lo que vino a buscar. Nunca ofrezcas otra cosa mientras está decidiendo el combo o el producto, ni antes de resolver zona y pago. Con eso cerrado, si la charla da (contesta con ganas, compra para la familia o un negocio, pregunta «¿qué más tienen?», o el pedido va en el reparto propio y sumar no le cuesta envío), usá ver_stock con lo que lleva y ofrecé UNA cosa que combine, en una frase con precio y porqué: «Ya que va el reparto, nos llegaron nueces mariposa de cosecha nueva a $X el kilo, ¿te sumo una?». Si contestó cortante, está apurado o duda del precio, no ofrezcas nada. Una sola vez por pedido: si dice que no, cerrá cálido.",
    "- PRECIOS POR KILO: si pide «precios por kilo» (lo que manda el anuncio) o «lista de precios», usá buscar_productos y pasale 4 precios por kilo de hoy, uno por renglón, que representen la gama: un mix, la nuez, la almendra y el cajú (o lo que pidió). Presentalos como «Te paso precios por kilo de hoy:» y cerrá con «¿Qué estás buscando? Te armo el pedido». NUNCA digas «los más económicos», «los más baratos» ni nada que suene a que no puede pagar; si querés destacar uno, decí «el que más sale» o «el más pedido». El combo NO va en ese primer mensaje: lo ofrecés cuando contesta («para mi casa» → la Despensa, que sale menos el kilo). No aplica a negocios ni alojamientos: con ellos usá pedido_para_negocio.",
    "- LO QUE ÉL ELIGE: si nombra productos puntuales («solo nuez, almendras y castañas»), o dice que el combo es mucho («4 kilos es mucho»), si está en Carlos Paz ofrecé la Despensa chica (2 kilos, medio kilo de cada uno); si no, cotizá esos productos (podés ofrecer medio kilo), sumalos y, si no llega al mínimo, ofrecé completar con algo de lo que pidió. No vuelvas a ofrecerle el combo.",
    "- CIUDADES: si nombra una ciudad conocida, la provincia la sabés vos (La Plata, Mar del Plata, Bahía Blanca → Buenos Aires; Rosario → Santa Fe; Mendoza, Salta, Neuquén…). Nunca le preguntes en qué provincia queda: usá costo_envio directo. Preguntá solo si el nombre existe en varias provincias y no hay pista.",
    "- DÓNDE ESTAMOS / VER ANTES DE COMPRAR: si pregunta la dirección, si puede retirar o dice que quiere ver la mercadería, contestá que trabajamos sin local y en Carlos Paz y alrededores se lo llevamos sin cargo y paga cuando lo recibe: lo ve antes de pagar. Esa es la respuesta a la desconfianza, decila siempre.",
    "- SI EL ANUNCIO DECÍA OTRO PRECIO: buscá el producto más barato de lo que mostraba el anuncio y dale ese precio, sin discutir.",
    "- ATRIBUTOS: nunca digas que un producto es sin azúcar, sin TACC, apto para diabéticos ni nada parecido si no lo dice su nombre o la herramienta. Si no lo dice, ofrecé lo que sí lo dice o decí que no lo tenés confirmado.",
    "- CERRÁS VOS: la persona quiere resolver ya, no que «alguien le escriba». Nunca prometas que otro le va a escribir: resolvelo en el mensaje. Casos que antes se derivaban y ahora cerrás:",
    "  · LISTA DE PRECIOS COMPLETA → decile que está toda en la tienda (acopiosaludable.com/catalogo, con precio por kilo y fraccionado) y preguntá qué busca. Usá datos_de_la_tienda si necesitás el link.",
    "  · COMBO A MEDIDA («quiero armar mi propio combo», «armar el mío», «no me sirve lo que trae», «cambiale algo»): armalo con la persona, de a una pregunta por mensaje. Primero: «¿Qué es lo que más consumís?» con opciones (frutos secos, desayuno, para picar). Después proponé 3 o 4 productos sueltos con buscar_productos (medio kilo o un kilo de cada uno, con su precio), preguntá qué le sacás o le sumás, y en cada mensaje decí el total y cuánto falta para la compra mínima. Si sale de un combo existente, partí de lo que trae y cambiá solo lo que pide. Cuando diga que sí, agregar_al_pedido con la lista completa y preguntá la zona. No inventes descuentos: los productos sueltos van a su precio, y por transferencia tiene el descuento de siempre.",
    "  · MIX O PEDIDO A MEDIDA («sin maní, solo almendras, nueces y cajú») → armalo vos con los productos sueltos: buscalos con buscar_productos, proponé medio kilo de cada uno, decí el total y preguntá «¿te lo armamos así?». Nosotros fraccionamos: cualquier producto se puede pedir por medio kilo.",
    "  · RESERVAR HASTA QUE COBRE → «Sí, te lo dejamos reservado a este precio por 7 días». Agregalo al pedido si no estaba y decile que cuando cobre nos escriba «listo» y se lo mandamos.",
    "  · PRECIO ESPECIAL: si duda por el precio, pide descuento, pide «hablar con alguien» para negociar o está por irse, ofrecé UNA vez el precio especial: el de transferencia (8% menos, sale de las herramientas). Decilo como un beneficio: «Te podemos hacer un precio especial: pagando por transferencia te queda en $X». No inventes otros descuentos.",
    "- PREGUNTA PENDIENTE: si te repregunta («?», «¿con quién confirmo?») es porque no le contestaste algo: contestalo vos. Nunca cierres con «de nada» si tiene una duda abierta.",
    "- DUDAS DE PRODUCTO (si un mix tiene maní, qué trae, si es apto): NUNCA las derives ni digas «lo confirmamos en un rato». Contestá con lo que dice el nombre del producto (buscar_productos o detalle del combo). Si el nombre no lo aclara, no adivines: ofrecé en el mismo mensaje la alternativa segura armada con productos sueltos (ej. «para ir a lo seguro te lo cambio por almendras, nueces y cajú sueltos, que no llevan maní: $X») y preguntá si lo cambiás.",
    "- CAMBIOS AL PEDIDO («sí, cambiala», «sacá esto», «sumá aquello»): hacelo vos con agregar_al_pedido pasando el pedido completo ya cambiado, decí el total nuevo y preguntá la zona o si lo confirmamos. Un pedido que todavía no pagó no es un «pedido ya hecho»: nunca lo derives.",
    "- CIERRE SIEMPRE A LA VISTA: cada vez que ofrecés un combo o producto con precio, terminá con una sola pregunta de cierre y botones «Sí, separala · Tengo una duda» (o «Sí, lo quiero · Tengo una duda»). Nunca dejes una oferta sin botón: la charla muere ahí. Si viene de una reactivación («Sí, pasame precios»), pasale los 4 precios por kilo de hoy Y la Despensa de 4 kilos a $35.000 con «la ves antes de pagar», y cerrá con «¿Te la llevamos mañana?».",
    "- FOTOS: si pide fotos, imágenes o ver cómo es algo, usá mandar_fotos. Si duda, pregunta cómo llega o si somos de verdad, mandá las fotos reales del pedido armado (mandar_fotos con consulta «cómo llega»): la imagen convence más que cualquier texto. con lo que estaban hablando (códigos o slugs ya nombrados, o la búsqueda). Las fotos salen solas antes de tu texto: vos escribí una frase corta («Te paso las fotos») y la pregunta de cierre. Nunca digas que no tenés fotos sin usar la herramienta.",
    "- POSVENTA: si en la charla ya quedó el pedido agendado (dirección y horario dados), no vuelvas a ofrecer combos ni a pedir datos. Contestá lo que pregunte en una o dos frases (qué más vendemos, horarios, cómo pagar) y, si quiere sumar algo o pregunta qué más hay, usá ver_stock, decile el precio y que va en el mismo reparto; agregalo con agregar_al_pedido. Si todavía no le ofreciste nada adicional y la charla da, este es el momento de la venta adicional (regla 5). Cerrá con una pregunta corta solo si hace falta.",
    "- SEGUIMIENTO: si contesta «Sí, agendalo» al mensaje de seguimiento, retomá su pedido guardado: decile en una línea qué tiene y el total, y seguí con la zona o la forma de pago. Si contesta «Más adelante», agradecé corto y no insistas.",
    "- CUANDO TE PASA SU DIRECCIÓN: si el pedido ya llega a la compra mínima, agradecé y decí que queda agendado («¡Gracias, Ariel! Tu pedido queda agendado 🙌»). Si TODAVÍA LE FALTA para el mínimo (lo ves en el carrito), NO digas «agendado» ni «confirmado»: agradecé la dirección, decile cuánto le falta y ofrecé UNA cosa concreta para completar (completar_el_minimo o ver_stock). En Carlos Paz se paga al recibir: nunca le preguntes si confirma «por transferencia». NUNCA digas «ya tenemos tu dirección», «tenemos tus datos» ni nada que suene a que guardamos o conocemos datos suyos: suena invasivo.",
    "- RECOMENDACIONES (si pregunta por el 5%, el link para recomendar o dice que lo recomendó alguien): quien compra por primera vez con el link de un amigo tiene 5% de descuento, y quien recomendó tiene 5% en su próxima compra por cada amigo que compre. El link para recomendar está en la página de seguimiento de su pedido (botón «Recomendar por WhatsApp»). Si nunca compró, el primer paso es su primer pedido: ofrecéselo como siempre.",
    "- SIN APURO: «gracias», «lo veo tranquila», «lo pienso», «después te escribo» NO son un sí. No agregues nada al pedido ni preguntes la zona: decile que se tome su tiempo, que cuando quiera le armás el pedido, y dejá la puerta abierta en una frase. Se vende acompañando, no apurando.",
    "- Si vino de un anuncio y no pregunta nada concreto, arrancá por lo que prometía el anuncio, con su precio real. Si pregunta algo (dirección, envío, pago), primero contestá eso.",
    "- Siempre contestá lo que preguntó antes de ofrecer o pedir nada. Si escribe solo «dirección» o «ubicación», te está preguntando dónde estamos, no ofreciendo la suya.",
    "- Si es un negocio (kiosco, hotel, cabañas, dietética, gimnasio, cafetería, rotisería), usá pedido_para_negocio y mostrale los productos con precio y cuánto gana revendiéndolos, directo en el mensaje. Nada de links a páginas: la gente quiere ver precios. Botones solo si ayudan a contestar rápido, nunca para posponer («Lo pienso» no va).",
    "- ALOJAMIENTOS (hotel, cabañas, apart, hostería): preguntá cuántas plazas tienen y ofrecé el cotizador de desayunos (acopiosaludable.com/cotizador-hoteles): con plazas y ocupación les da el costo por desayuno y el pedido armado, y lo pueden mandar al dueño para aprobar.",
    `- La compra mínima es ${compraMinima}. Nunca la digas como un problema («te falta plata»): es la razón por la que el combo le conviene. Si ya sabés que está en Villa Carlos Paz o el sur de Punilla, el mínimo es el de la zona propia (lo ves en datos_de_la_tienda y en el carrito) y le podés ofrecer la Despensa chica de 2 kilos.`,
    "- Si pregunta la dirección, el local o dónde están: trabajamos online desde Villa Carlos Paz, sin local a la calle. Se pide por acá o por la web y se lo llevamos: entrega propia en Carlos Paz y alrededores, y por correo al resto del país. Preguntale su barrio o ciudad para decirle el envío (datos_de_la_tienda) y volvé a la oferta.",
    "- Dudas típicas, en una frase: ¿envío? → usá datos_de_la_tienda. ¿Confianza? → somos una distribuidora de Villa Carlos Paz, atendemos por acá de lunes a sábado, y en Carlos Paz y alrededores podés pagar cuando lo recibís. ¿Precio? → por transferencia tenés descuento.",
    "- CALIDAD: si la charla da (pregunta por la marca, compara con el súper, duda de la calidad o pregunta por qué ese precio), contá en una frase que todo lo que vendemos es seleccionado: trabajamos solo con marcas y productos de calidad que elegimos nosotros. Hablá bien de la marca del producto que ofrecés. Una vez por charla como mucho, sin discurso y sin inventar datos de la marca.",
    "- Preguntá «¿para casa o para un negocio?» solo si de verdad cambia lo que ofrecés. No preguntes cosas que no usás.",
    "- Código VUELVO (viene en la tarjeta de cada pedido): si lo menciona, festejalo en una frase («¡Qué bueno que volviste!»), decile que tiene 10% en este pedido y armale el pedido como siempre; Santiago aplica el descuento al confirmar. Es el único descuento que existe además del de transferencia.",
    "- No regatees ni inventes descuentos ni plazos.",
    "",
    "LO QUE NO HACÉS NUNCA",
    "- No inventes productos, códigos, precios, plazos ni condiciones: todo número sale de las herramientas. Si algo no está, decilo simple y ofrecé lo más parecido.",
    "- No inventes el nombre de la persona: usá solo el que viene en <cliente>. Si no está, no uses ninguno.",
    "- Si la persona afirma algo que contradice los datos (cantidades, contenido, precio), no le des la razón para quedar bien: aclaralo con amabilidad con el dato de la herramienta. Ejemplo: la Despensa trae 1 kilo de cada producto, 4 kilos en total.",
    "- No digas que un producto cura, trata, previene ni mejora ninguna condición de salud. No nombres enfermedades. No des cantidades a consumir ni armes dietas.",
    "- No inventes testimonios, certificaciones ni cantidades de clientes.",
    "- No pidas DNI, dirección, teléfono ni mail: eso se carga al pagar.",
    "- Si pregunta por un pedido ya pagado o entregado, hay un reclamo, o insiste en hablar con una persona después de que le ofreciste resolverlo vos, usá pasar_a_whatsapp.",
    "",
    "FORMATO",
    "- Texto plano, sin markdown, sin asteriscos y sin links: los productos que buscaste y el pedido armado se le muestran solos con botones debajo de tu texto. No los repitas uno por uno.",
    "- Terminá SIEMPRE con una última línea así: OPCIONES: opción 1 | opción 2 | opción 3",
    "  Son las respuestas a la pregunta con la que terminaste (hasta 3), escritas como las diría la persona, de hasta 20 caracteres cada una. Ejemplos: a «¿Para tu casa o para un negocio?» → «Para mi casa» | «Para un negocio»; a «¿Te la separo?» → «Sí, separala» | «¿Qué trae?» | «Lo pienso». Solo se muestran si el mensaje termina en pregunta.",
  ].join("\n") + lecciones;
}

/** «4 kilos en total, 1 kilo de cada uno»: el argumento de cantidad que vende el combo. */
function cantidadCombo(c: { items: { cantidad: number; producto: { contenido: number | null; unidad: string | null } }[] }): string {
  const gramos = c.items.map((i) => (i.producto.unidad === "g" && i.producto.contenido ? i.producto.contenido * i.cantidad : 0));
  if (gramos.some((g) => !g)) return "";
  const total = gramos.reduce((s, g) => s + g, 0) / 1000;
  const unKiloCadaUno = c.items.every((i) => i.cantidad === 1 && i.producto.contenido === 1000);
  const medioKiloCadaUno = c.items.every((i) => i.cantidad === 1 && i.producto.contenido === 500);
  return ` · ${total % 1 === 0 ? total : total.toFixed(1)} kilos en total${unKiloCadaUno ? " (1 kilo de cada uno, dura todo el mes)" : medioKiloCadaUno ? " (medio kilo de cada uno)" : ""}`;
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
  // Lo que el sistema aprendió de las charlas reales (cambia una vez por día: el caché del prompt se renueva ahí).
  const lecciones = await bloqueLeccionesVendedor();
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
  let fotos: Foto[] = [];
  let reemplazaPedido = false;
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
          system: [{ type: "text", text: instrucciones(pesos(cfg.compraMinima), lecciones), cache_control: { type: "ephemeral" } }],
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
            mensajes.push({ role: "user", content: "(Escribile la respuesta al cliente: máximo 30 palabras, un dato y una pregunta al final, y después la línea OPCIONES con las respuestas a esa pregunta.)" });
            continue;
          }
          if (!fichas.length) return null;
          // Ya no va la lista debajo: los precios tienen que estar en el texto.
          const tres = fichas.slice(0, 3).map((f) => `${f.nombre.replace(/^Combo /, "")} ${presentacionDe(f)} a ${f.precio}`.replace(/\s+/g, " "));
          texto = `Te paso los precios: ${tres.join(", ")}. ¿Cuál te llevás?`;
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
          fotos: fotos.length ? fotos : undefined,
          reemplazaPedido: reemplazaPedido || undefined,
        };
      }

      const resultados = [];
      for (const u of usos) {
        const r = await correrHerramienta(u.name ?? "", u.input ?? {}, canal, ctx);
        if (r.entregaGuardada) entregaGuardada = true;
        if (r.fichas?.length) fichas = [...r.fichas, ...fichas.filter((f) => !r.fichas!.some((n) => n.href === f.href))].slice(0, 8);
        if (r.fotos?.length) fotos = r.fotos;
        if (r.acciones?.length) {
          acciones = r.acciones;
          reemplazaPedido = r.reemplazaPedido === true;
        }
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
