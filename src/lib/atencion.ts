// Atender un mensaje entrante, venga de WhatsApp, Messenger o Instagram.
//
// Los tres canales llegan por webhooks distintos pero se atienden igual: se guarda el mensaje
// (el id de Meta es clave primaria, así una reentrega no se contesta dos veces), se respeta si
// una persona tomó la charla o si el prospecto pidió la baja, y contesta el mismo vendedor.
// Lo único que cambia por canal es cómo se manda la respuesta.

import { detectar, pidePersona } from "./asistente";
import { buscarEnCatalogo, comboDelAnuncio, type Accion, type Respuesta } from "./asistente-catalogo";
import { responderComoVendedor, vendedorActivo, type Turno } from "./vendedor";
import { enviarSaliente, enviarTexto, marcarLeido, paraWhatsapp } from "./whatsapp-cloud";
import { leerToque, planTrae, planWhatsapp, textoParaPanel, type PedidoArmado, type Saliente } from "./whatsapp-interactivo";
import { enlacePedido, leerPedido } from "./pedido-enlace";
import { combosTienda, cotizarCarrito } from "./tienda";
import { leerConfig } from "./config";
import { pesos, renglonCombo } from "./precios";
import { urlSitio } from "./sitio";
import { canalDe, enviarMeta, marcarVistoMeta } from "./meta-mensajes";
import { cambiarEstado, estadoDe, historialDe, ultimoDelCliente, registrarAnuncio, registrarEntrante, registrarSalida } from "./whatsapp-memoria";
import { contextoProspecto, darDeBaja, datosProspecto, esBaja } from "./whatsapp-prospectos";
import { AVISO_SUPLEMENTOS } from "./sitio";

const SALUD =
  "Eso no te lo puedo responder: no damos indicaciones de salud ni de consumo. Para eso consultá a tu médico o nutricionista. " +
  "Si querés, te paso el producto con su presentación y precio.";

const DERIVADO = "Dale, ya te escribo yo personalmente por acá. Atiendo de lunes a sábado, de 8 a 20 h. Mientras tanto contame qué necesitás así lo tengo a mano.";

// Un identificador no va entero a los logs: con los últimos cuatro alcanza para seguir una charla.
const ESPERA_RAFAGA_MS = 4000;

export const cola = (n: string) => `…${n.slice(-4)}`;

/** Manda un texto por el canal que corresponda a la charla. */
export async function enviarPorCanal(clave: string, texto: string): Promise<boolean> {
  return canalDe(clave) === "whatsapp" ? enviarTexto(clave, texto) : enviarMeta(clave, texto);
}

export type Entrada = {
  clave: string; // teléfono, o fb./ig. + id
  idMensaje: string;
  nombre: string | null;
  texto: string | null; // null: no es texto ni botón (audio, foto, sticker...)
  toque?: string | null; // id del botón o fila que tocó, en WhatsApp
  tipo: string;
  anuncio?: { id: string | null; titulo: string | null; texto: string | null; ctwaClid: string | null } | null;
};

async function responder(clave: string, texto: string): Promise<boolean> {
  const enviado = await enviarPorCanal(clave, texto);
  console.log("chat: envío", { canal: canalDe(clave), de: cola(clave), enviado });
  if (enviado) await registrarSalida(clave, "bot", texto);
  return enviado;
}

/** Manda una tanda de mensajes de WhatsApp en orden y deja cada uno en el panel. */
async function responderWhatsapp(clave: string, salientes: Saliente[]): Promise<void> {
  for (const m of salientes) {
    const enviado = await enviarSaliente(clave, m);
    console.log("chat: envío", { canal: "whatsapp", tipo: m.tipo, de: cola(clave), enviado });
    if (enviado) await registrarSalida(clave, "bot", textoParaPanel(m));
  }
}

/** El pedido que armó el vendedor, cotizado por el servidor: los precios nunca salen del modelo. */
async function pedidoDe(acciones: Accion[] | undefined): Promise<PedidoArmado | null> {
  if (!acciones?.length) return null;
  const lineas = acciones.map((a) => ({ tipo: a.clase, id: a.id, cantidad: a.cantidad }));
  const cot = await cotizarCarrito(lineas);
  if (!cot.lineas.length) return null;
  return {
    camino: enlacePedido(lineas),
    renglones: cot.lineas.filter((l) => l.disponible).map((l) => `${l.cantidad > 1 ? `${l.cantidad} x ` : ""}${l.nombre} — ${pesos(l.subtotal)}`),
    total: pesos(cot.subtotal),
    conTransferencia: cot.conTransferencia ? pesos(cot.conTransferencia) : null,
    falta: cot.falta > 0 ? pesos(cot.falta) : null,
  };
}

/** Tocó «Mercado Pago»: recién ahí va el link, dentro de un botón y explicado. Sin pasar por el modelo. */
async function cobrarConLink(clave: string, camino: string): Promise<void> {
  await responderWhatsapp(clave, await planCobroLink(camino));
}

/** El mensaje con el botón «Pagar mi pedido». Separado para que el simulador muestre lo mismo. */
export async function planCobroLink(camino: string): Promise<Saliente[]> {
  const cot = await cotizarCarrito(leerPedido(camino.replace(/^\/carrito\?p=/, "")));
  return [
    {
      tipo: "cta",
      cuerpo: `¡Buenísimo! 🙌 Te dejo el pedido armado${cot.subtotal ? ` (${pesos(cot.subtotal)})` : ""} en nuestra web. Ahí ponés el código postal, ves el envío y pagás con Mercado Pago, que es seguro. Cualquier duda me escribís por acá.`,
      texto: "Pagar mi pedido",
      url: `${urlSitio()}${camino}`,
      pie: "acopiosaludable.com",
    },
  ];
}

/** Tocó «Transferencia»: total con descuento, datos para transferir y la charla pasa a una persona. */
async function cobrarPorTransferencia(clave: string, camino: string): Promise<void> {
  const [cot, cfg] = await Promise.all([cotizarCarrito(leerPedido(camino.replace(/^\/carrito\?p=/, ""))), leerConfig()]);
  const total = cot.conTransferencia ?? cot.subtotal;
  const partes = [
    `Perfecto${cfg.descuentoTransferenciaPct > 0 ? `, por transferencia tenés ${cfg.descuentoTransferenciaPct}% de descuento` : ""}: el pedido te queda en ${pesos(total)} más el envío.`,
    cfg.transferenciaDatos ? `Los datos para transferir:\n${cfg.transferenciaDatos}` : "",
    "Pasame tu dirección o barrio así te confirmo el envío, y cuando transfieras mandame el comprobante por acá. Lo sigo yo personalmente.",
  ].filter(Boolean);
  await responderWhatsapp(clave, [{ tipo: "texto", texto: partes.join("\n\n") }]);
  // Para que en el panel se vea qué pidió sin abrir nada.
  await registrarSalida(clave, "bot", `[Pedido por transferencia: ${cot.lineas.map((l) => `${l.cantidad} x ${l.nombre}`).join(", ")} · ${pesos(total)}]`);
  await cambiarEstado(clave, "persona");
}

export async function atender(e: Entrada): Promise<void> {
  const canal = canalDe(e.clave);
  const texto = e.texto !== null ? e.texto.trim().slice(0, 400) : `[${e.tipo}]`;
  const nuevo = await registrarEntrante(e.idMensaje, e.clave, e.nombre, texto);
  if (!nuevo) {
    console.log("chat: repetido, se ignora", e.idMensaje);
    return;
  }
  if (canal === "whatsapp") await marcarLeido(e.idMensaje);
  else await marcarVistoMeta(e.clave);

  const ref = e.anuncio;
  if (ref && (ref.id || ref.ctwaClid)) {
    await registrarAnuncio(e.clave, { anuncioId: ref.id, titulo: ref.titulo ?? ref.texto?.slice(0, 120) ?? null, ctwaClid: ref.ctwaClid });
    console.log("chat: viene de un anuncio", { canal, de: cola(e.clave), anuncio: ref.id });
  }

  // Una persona tomó la charla: el bot no se mete. El mensaje queda guardado y suma no leídos.
  if ((await estadoDe(e.clave)) === "persona") {
    console.log("chat: en manos de una persona, el bot se calla", cola(e.clave));
    return;
  }

  // Prospecto que dice que no: se le da de baja, se le agradece una vez y nunca más.
  const prospecto = await datosProspecto(e.clave);
  if (prospecto.baja) {
    console.log("chat: dado de baja, no se contesta", cola(e.clave));
    return;
  }
  if (prospecto.prospecto && e.texto !== null && esBaja(texto)) {
    await darDeBaja(e.clave);
    await responder(e.clave, "Perfecto, no le escribimos más. ¡Gracias por responder y que tengan una buena temporada!");
    return;
  }

  if (e.texto === null) {
    await responder(e.clave, "Por ahora te leo solo mensajes de texto. Escribime qué estás buscando y te paso precio y link.");
    return;
  }
  if (!texto) return;

  if (detectar(texto) === "salud") {
    await responder(e.clave, `${SALUD}\n\n${AVISO_SUPLEMENTOS}`);
    return;
  }

  // La gente escribe en ráfagas: «Hola», «¿hay almendras?», «para casa». Se espera un momento y,
  // si llegó otro mensaje después de este, se deja que conteste ese, que ya ve toda la ráfaga.
  // Antes se contestaba cada uno por separado: tres respuestas casi iguales seguidas, como un robot.
  if (!e.toque) {
    await new Promise((r) => setTimeout(r, ESPERA_RAFAGA_MS));
    const ultimo = await ultimoDelCliente(e.clave);
    if (ultimo && ultimo !== e.idMensaje) {
      console.log("chat: llegó otro después, contesta ese", cola(e.clave));
      return;
    }
  }

  // Botones que no necesitan al modelo: cobrar es un paso fijo, no una charla.
  const toque = canal === "whatsapp" ? leerToque(e.toque) : null;
  if (toque?.tipo === "pagar") return cobrarConLink(e.clave, toque.camino);
  if (toque?.tipo === "transferencia") return cobrarPorTransferencia(e.clave, toque.camino);

  // El historial se lee sin el mensaje recién guardado: el vendedor lo recibe aparte.
  const historial = (await historialDe(e.clave, 9)).slice(0, -1);
  const inicio = Date.now();
  const p = await pensar({
    canal,
    texto,
    toque,
    historial,
    anuncio: ref ? { titulo: ref.titulo, texto: ref.texto } : null,
    nombre: e.nombre,
    negocio: prospecto.prospecto ? contextoProspecto(prospecto.prospecto, prospecto.negocio) : "",
  });
  console.log("chat: respuesta armada", { canal, de: cola(e.clave), conIA: p.conIA, ms: Date.now() - inicio, derivar: p.derivar, tipos: p.salientes.map((x) => x.tipo) });

  if (p.derivar) {
    await responder(e.clave, DERIVADO);
    await cambiarEstado(e.clave, "persona");
    return;
  }
  if (canal === "whatsapp") {
    await responderWhatsapp(e.clave, p.salientes);
    return;
  }
  const salida = paraWhatsapp(p.respuesta);
  if (salida) await responder(e.clave, salida);
}

export type Pensado = { salientes: Saliente[]; respuesta: Respuesta; derivar: boolean; conIA: boolean };

/**
 * Qué contestar, sin mandar nada ni tocar la base de mensajes. Lo usa atender() y lo usa el
 * simulador del panel, así lo que se prueba es exactamente lo que recibe el cliente.
 */
export async function pensar(c: {
  canal: ReturnType<typeof canalDe>;
  texto: string;
  toque: ReturnType<typeof leerToque>;
  historial: Turno[];
  anuncio: { titulo: string | null; texto: string | null } | null;
  nombre: string | null;
  negocio: string;
}): Promise<Pensado> {
  // «¿Qué trae?» de un combo: la lista completa, fija, sin gastar el modelo.
  if (c.toque?.tipo === "trae") {
    const combo = (await combosTienda({ slug: c.toque.slug, tipo: "COMBO" }))[0];
    if (combo?.disponible) {
      const salientes = planTrae({
        slug: combo.slug,
        nombre: combo.nombre,
        precio: pesos(Math.round(combo.precio)),
        ahorro: pesos(Math.round(combo.ahorro)),
        renglones: combo.items.map(({ producto, cantidad }) => renglonCombo(producto, cantidad)),
      });
      return { salientes, respuesta: { texto: "" }, derivar: false, conIA: false };
    }
  }

  // Lo que prometió el anuncio, quién es y qué tocó van pegados al mensaje y no a las
  // instrucciones, para no romper el caché del prompt.
  const textoAnuncio = c.anuncio ? [c.anuncio.titulo, c.anuncio.texto].filter(Boolean).join(" — ").slice(0, 300) : "";
  const combo = textoAnuncio ? await comboDelAnuncio(textoAnuncio) : null;
  const anuncio = textoAnuncio
    ? `<anuncio>Tocó un anuncio que decía: ${textoAnuncio}.${
        combo
          ? ` Es el combo slug ${combo.slug} «${combo.nombre}», hoy a ${pesos(Math.round(combo.precio))} (lista ${pesos(Math.round(combo.precioLista))}), trae: ${combo.items.map((i) => `${i.cantidad} x ${i.producto.producto} ${i.producto.presentacion}`).join(", ")}.`
          : ""
      } Arrancá por eso aunque su mensaje pregunte otra cosa: contale qué trae y por qué conviene, y ofrecé dejárselo listo.</anuncio>\n\n`
    : "";
  const cliente = !c.historial.length && c.nombre ? `<cliente>Se llama ${c.nombre.slice(0, 40)}.</cliente>\n` : "";
  const eligio =
    c.toque?.tipo === "quiero"
      ? `<eligio>Tocó «Lo quiero» en el ${c.toque.clase} ${c.toque.clase === "combo" ? "slug" : "codigo"} ${c.toque.id}. Agregalo YA con agregar_al_pedido (junto con lo que ya había elegido antes) y en una frase ofrecé sumar algo chico o dejarlo listo para pagar.</eligio>\n`
      : "";
  const r = vendedorActivo() ? await responderComoVendedor(`${c.negocio}${cliente}${anuncio}${eligio}${c.texto}`, c.historial, null, "whatsapp") : null;

  let respuesta: Respuesta;
  if (r) respuesta = r;
  else {
    // Sin IA (caída o sin clave): el buscador, pero dicho como lo diría una persona.
    const b = await buscarEnCatalogo(c.texto);
    respuesta = b.fichas?.length
      ? { ...b, texto: "¡Hola! Te paso lo que tengo de eso, tocá el que te interese y te lo dejo listo 👇", enlaces: undefined, opciones: ["Ver combos", "Hablar con Santiago"] }
      : { texto: "¡Hola! Contame qué estás buscando y te paso precio al toque. Tenemos frutos secos, semillas, harinas sin TACC, cereales y combos armados.", opciones: ["Frutos secos", "Ver combos", "Sin TACC"] };
  }

  // Vino del anuncio de un combo y todavía no lo eligió: la respuesta lleva la tarjeta del combo,
  // con «Lo quiero» a un toque. Sin esto, el texto lo ofrecía pero no había botón para tomarlo.
  if (combo && !respuesta.fichas?.length && !respuesta.acciones?.length) {
    respuesta = {
      ...respuesta,
      fichas: [{ href: `/combos/${combo.slug}`, nombre: `Combo ${combo.nombre}`, detalle: "Trae: combo", precio: pesos(Math.round(combo.precio)), foto: combo.fotoUrl }],
    };
  }

  // Pedir una persona deriva siempre, conteste la IA o el buscador.
  const derivar = Boolean(respuesta.derivar) || pidePersona(c.texto);
  const salientes = derivar ? [{ tipo: "texto" as const, texto: DERIVADO }] : planWhatsapp(respuesta, await pedidoDe(respuesta.acciones));
  return { salientes, respuesta, derivar, conIA: Boolean(r) };
}
