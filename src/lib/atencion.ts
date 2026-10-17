// Atender un mensaje entrante, venga de WhatsApp, Messenger o Instagram.
//
// Los tres canales llegan por webhooks distintos pero se atienden igual: se guarda el mensaje
// (el id de Meta es clave primaria, así una reentrega no se contesta dos veces), se respeta si
// una persona tomó la charla o si el prospecto pidió la baja, y contesta el mismo vendedor.
// Lo único que cambia por canal es cómo se manda la respuesta.

import { detectar, esRespuestaAutomatica, pidePersona } from "./asistente";
import { buscarEnCatalogo, comboDelAnuncio, type Accion, type EnvioCotizado, type Respuesta } from "./asistente-catalogo";
import { cotizarEnvioChat } from "./envio-chat";
import { argumentoCombo } from "./combos-tema";
import { responderComoVendedor, vendedorActivo, type Turno } from "./vendedor";
import { enviarSaliente, enviarTexto, marcarLeido, paraWhatsapp } from "./whatsapp-cloud";
import { leerToque, pagaAlRecibir, planDeNada, planSinApuro, soloAgradece, tieneDireccion, planTrae, planVer, planWhatsapp, postergaCompra, quiereVer, textoParaPanel, type PedidoArmado, type Saliente } from "./whatsapp-interactivo";
import { enlacePedido, leerPedido } from "./pedido-enlace";
import { combosTienda, cotizarCarrito } from "./tienda";
import { completarEntrega, crearPedidoWhatsapp, numeroPedido } from "./pedidos";
import { avisarSantiago } from "./avisos";
import { leerConfig } from "./config";
import { pesos, renglonCombo } from "./precios";
import { urlSitio } from "./sitio";
import { canalDe, enviarMeta, marcarVistoMeta } from "./meta-mensajes";
import { cambiarEstado, estadoDe, guardarPedido, respuestasRecientes, historialDe, pedidoGuardado, ultimoDelCliente, registrarAnuncio, registrarEntrante, registrarSalida } from "./whatsapp-memoria";
import { contextoProspecto, darDeBaja, datosProspecto, esBaja } from "./whatsapp-prospectos";
import { AVISO_SUPLEMENTOS } from "./sitio";
import { NOMBRE_MEDIO, respuestaMedio } from "./whatsapp-media";
import { MARCA_PROVEEDOR } from "./whatsapp-proveedores";

const SALUD =
  "Entiendo, y qué bueno que te estés cuidando 💚 Sobre salud no te puedo aconsejar, eso lo ve mejor tu médico o nutricionista. " +
  "Lo que sí puedo es contarte qué productos son sin azúcar agregada y pasarte precios. ¿Querés que te los pase?";

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
  guardar?: string; // lo que queda en la charla, si no es el texto (foto, audio, reacción)
  silencioso?: boolean; // reacción o sticker: se guarda y no se contesta
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

/** El pedido armado, cotizado por el servidor: los precios nunca salen del modelo. Con el envío si ya se sabe la zona. */
async function pedidoDe(lineas: { tipo: "producto" | "combo"; id: string; cantidad: number }[], envio?: EnvioCotizado | null): Promise<PedidoArmado | null> {
  if (!lineas.length) return null;
  const cot = await cotizarCarrito(lineas);
  if (!cot.lineas.length) return null;
  const cfg = envio ? await leerConfig() : null;
  return {
    camino: enlacePedido(lineas),
    renglones: cot.lineas.filter((l) => l.disponible).map((l) => `${l.cantidad > 1 ? `${l.cantidad} x ` : ""}${l.nombre} — ${pesos(l.subtotal)}`),
    total: pesos(cot.subtotal),
    conTransferencia: cot.conTransferencia ? pesos(cot.conTransferencia) : null,
    falta: cot.falta > 0 ? pesos(cot.falta) : null,
    envio: envio
      ? {
          ...envio,
          totalConEnvio: envio.costo !== null && envio.costo > 0 ? pesos(cot.subtotal + envio.costo) : null,
          transferenciaConEnvio:
            cot.conTransferencia && cfg && cfg.descuentoTransferenciaPct > 0 ? `${pesos(cot.conTransferencia + (envio.costo ?? 0))}${envio.costo === null ? " + envío" : ""}` : null,
        }
      : null,
  };
}

const lineasDeAcciones = (acciones?: Accion[]) => (acciones ?? []).map((a) => ({ tipo: a.clase, id: a.id, cantidad: a.cantidad }));
const lineasDeCamino = (camino: string) => leerPedido(camino.replace(/^\/carrito\?p=/, ""));

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
/**
 * Cerró la venta: Transferencia o Pago al recibir. Se crea el pedido en el panel (con lista de compra
 * a Distrimay), se le avisa a Santiago y el vendedor le pide nombre, dirección y horario para entregar.
 */
async function cerrarVenta(
  clave: string,
  nombre: string | null,
  medio: "TRANSFERENCIA" | "AL_RECIBIR",
  camino: string,
  envio: { costo: number | null; lugar: string } | null,
  direccion?: string,
): Promise<void> {
  const cfg = await leerConfig();
  const lineas = leerPedido(camino.replace(/^\/carrito\?p=/, ""));
  let pedido;
  try {
    pedido = await crearPedidoWhatsapp({ lineas, medioPago: medio, nombre: nombre ?? "", telefono: clave, envio: envio ?? { lugar: "A confirmar", costo: null } });
  } catch (e) {
    console.error("chat: no se pudo crear el pedido", cola(clave), e);
    await responder(clave, "¡Genial! Ya le paso tu pedido a Santiago y te escribe enseguida para coordinar.");
    await avisarSantiago("Venta por WhatsApp sin pedido", `No se pudo crear el pedido de ${nombre ?? clave} (${clave}). Revisá la charla en el panel.`);
    await cambiarEstado(clave, "persona");
    return;
  }
  const total = pesos(Number(pedido.total));
  const envioTxt = envio?.costo === 0 ? "con envío sin cargo" : envio?.costo ? "con el envío incluido" : "más el envío, que te confirmo";
  // Ya pasó la dirección: no se le vuelve a pedir nada. Se confirma y listo.
  if (direccion) await completarEntrega(pedido.id, { direccion });
  const partes = direccion
    ? [
        `¡Listo${nombre ? `, ${nombre.split(/\s+/)[0]}` : ""}! Tu pedido es el ${numeroPedido(pedido.id)}: ${total} ${envioTxt}. Te lo llevo a ${direccion.slice(0, 120)} en ${cfg.plazoEntregaPropia} y lo pagás ahí${medio === "TRANSFERENCIA" ? " por transferencia" : ", en efectivo o por transferencia"} 🙌`,
        "Si tenés un horario que te quede mejor, decime y lo anoto.",
      ]
    : medio === "TRANSFERENCIA"
      ? [
          `¡Listo! Tu pedido es el ${numeroPedido(pedido.id)}: ${total} ${envioTxt}${cfg.descuentoTransferenciaPct > 0 ? `, ya con el ${cfg.descuentoTransferenciaPct}% de descuento por transferencia` : ""}.`,
          cfg.transferenciaDatos ? `Los datos para transferir:\n${cfg.transferenciaDatos}` : "",
          "Para mandártelo pasame en un mensaje: nombre y apellido, dirección (calle, número y barrio) y en qué horario te queda bien recibirlo. Cuando transfieras, mandame el comprobante por acá 🙌",
        ]
      : [
          `¡Listo! Tu pedido es el ${numeroPedido(pedido.id)}: ${total} ${envioTxt}. Lo pagás cuando lo recibís, en efectivo o por transferencia.`,
          "Para llevártelo pasame en un mensaje: nombre y apellido, dirección (calle, número y barrio) y en qué horario te queda bien recibirlo 🙌",
        ];
  await responderWhatsapp(clave, [{ tipo: "texto", texto: partes.filter(Boolean).join("\n\n") }]);
  // La charla queda atada al pedido: lo que mande ahora (dirección, horario) se guarda ahí.
  await guardarPedido(clave, `orden:${pedido.id}`);
}

export async function atender(e: Entrada): Promise<void> {
  const canal = canalDe(e.clave);
  const texto = e.texto !== null ? e.texto.trim().slice(0, 400) : `[${e.tipo}]`;
  const nuevo = await registrarEntrante(e.idMensaje, e.clave, e.nombre, (e.guardar ?? texto).slice(0, 600));
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

  // Una reacción o un sticker: queda en el panel y no se contesta.
  if (e.silencioso) return;

  // Una persona tomó la charla: el bot no se mete. El mensaje queda guardado y suma no leídos.
  if ((await estadoDe(e.clave)) === "persona") {
    console.log("chat: en manos de una persona, el bot se calla", cola(e.clave));
    return;
  }

  // Prospecto que dice que no: se le da de baja, se le agradece una vez y nunca más.
  const prospecto = await datosProspecto(e.clave);
  // Un proveedor: no le habla el vendedor. Queda para Santiago y le llega el aviso.
  if (prospecto.prospecto === MARCA_PROVEEDOR) {
    await avisarSantiago(`Proveedor: ${prospecto.negocio ?? e.clave}`, `📦 ${prospecto.negocio ?? e.nombre ?? e.clave} contestó:\n${(e.guardar ?? texto).slice(0, 300)}\n${urlSitio()}/admin/whatsapp?c=${e.clave}`);
    return;
  }
  if (prospecto.baja) {
    console.log("chat: dado de baja, no se contesta", cola(e.clave));
    return;
  }
  if (prospecto.prospecto && e.texto !== null && esBaja(texto)) {
    await darDeBaja(e.clave);
    await responder(e.clave, "Perfecto, no le escribimos más. ¡Gracias por responder y que tengan una buena temporada!");
    return;
  }

  // Audio, foto sin texto, video, archivo: el vendedor no lo puede leer. Se le pide que lo escriba
  // y le llega el aviso a Santiago, que lo puede escuchar o ver en el panel.
  if (e.texto === null) {
    await responder(e.clave, respuestaMedio(e.tipo));
    const que = NOMBRE_MEDIO[e.tipo as keyof typeof NOMBRE_MEDIO] ?? e.tipo;
    await avisarSantiago(`Mandó ${que}`, `📎 ${e.nombre ?? e.clave} mandó ${que === "foto" ? "una foto" : `un ${que}`}. Miralo en el panel:\n${urlSitio()}/admin/whatsapp?c=${e.clave}`);
    return;
  }
  if (!texto) return;

  // Freno de bucles: si del otro lado contesta un bot, o si ya le mandamos muchos mensajes seguidos,
  // el vendedor se calla y la charla pasa a una persona. Dos bots hablándose es spam para WhatsApp.
  if (esRespuestaAutomatica(texto) || (await respuestasRecientes(e.clave, 10)) >= 15) {
    console.log("chat: respuesta automática o demasiados mensajes seguidos, pasa a una persona", cola(e.clave));
    await cambiarEstado(e.clave, "persona");
    await avisarSantiago("Charla pausada", `🤖 La charla con ${e.nombre ?? e.clave} se pausó (respondió un bot o hubo muchos mensajes seguidos). Revisala:\n${urlSitio()}/admin/whatsapp?c=${e.clave}`);
    return;
  }

  // Código de la tarjeta que va en cada pedido: el vendedor lo reconoce y Santiago aplica el 10%.
  if (/\bvuelvo\b/i.test(texto)) {
    await avisarSantiago("Código VUELVO", `🎟️ ${e.nombre ?? e.clave} usó el código VUELVO (10% en su segunda compra). Aplicalo al pedido:\n${urlSitio()}/admin/whatsapp?c=${e.clave}`);
  }

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
  if (toque?.tipo === "transferencia") return cerrarVenta(e.clave, e.nombre, "TRANSFERENCIA", toque.camino, toque.envio);
  if (toque?.tipo === "recibir") return cerrarVenta(e.clave, e.nombre, "AL_RECIBIR", toque.camino, toque.envio);

  // «Pago aquí» con el pedido armado: se cierra al recibir, sin preguntar zona (pagar al recibir
  // es solo en Carlos Paz y alrededores). Si en el mismo mensaje viene la dirección, queda anotada.
  const guardado = canal === "whatsapp" ? await pedidoGuardado(e.clave) : null;
  if (guardado?.startsWith("/carrito?p=") && pagaAlRecibir(texto)) {
    const direccion = tieneDireccion(texto) ? texto.replace(/\b(pago|abono)[^.]*\.?/gi, "").replace(/\s+/g, " ").trim().slice(0, 160) : undefined;
    console.log("chat: paga al recibir, se cierra sin preguntar zona", cola(e.clave));
    return cerrarVenta(e.clave, e.nombre, "AL_RECIBIR", guardado, { costo: 0, lugar: "Villa Carlos Paz" }, direccion || undefined);
  }

  // El historial se lee sin el mensaje recién guardado: el vendedor lo recibe aparte.
  const historial = (await historialDe(e.clave, 9)).slice(0, -1);
  const inicio = Date.now();
  const p = await pensar({
    pedidoGuardado: guardado,
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
    await avisarSantiago("Charla para vos", `💬 ${e.nombre ?? "Alguien"} (${e.clave}) quiere hablar con una persona.\nÚltimo mensaje: «${texto.slice(0, 200)}»\n${urlSitio()}/admin/whatsapp?c=${e.clave}`);
    return;
  }
  if (canal === "whatsapp") {
    await responderWhatsapp(e.clave, p.salientes);
    if (p.guardarPedido) await guardarPedido(e.clave, p.guardarPedido);
    // Ya pasó los datos de entrega: la sigue Santiago (el aviso con todo ya le llegó).
    if (p.aPersona) await cambiarEstado(e.clave, "persona");
    return;
  }
  const salida = paraWhatsapp(p.respuesta);
  if (salida) await responder(e.clave, salida);
}

export type Pensado = { salientes: Saliente[]; respuesta: Respuesta; derivar: boolean; conIA: boolean; guardarPedido?: string; aPersona?: boolean };

/**
 * Qué contestar, sin mandar nada ni tocar la base de mensajes. Lo usa atender() y lo usa el
 * simulador del panel, así lo que se prueba es exactamente lo que recibe el cliente.
 */
const normalizar = (t: string) => t.toLowerCase().replace(/\[.*?\]/g, "").replace(/[^a-záéíóúñ0-9$]+/g, " ").trim();

export async function pensar(c: {
  canal: ReturnType<typeof canalDe>;
  texto: string;
  toque: ReturnType<typeof leerToque>;
  historial: Turno[];
  anuncio: { titulo: string | null; texto: string | null } | null;
  nombre: string | null;
  negocio: string;
  pedidoGuardado?: string | null;
}): Promise<Pensado> {
  // Tocó su zona (Carlos Paz, Córdoba Capital) con el pedido ya armado: envío y botones de pago, sin modelo.
  if (c.toque?.tipo === "zona" && c.pedidoGuardado) {
    const lineas = lineasDeCamino(c.pedidoGuardado);
    const previo = await pedidoDe(lineas);
    const envio = await cotizarEnvioChat(c.toque.lugar, null, previo ? Number(previo.total.replace(/[^\d,]/g, "").replace(",", ".")) : 0);
    const pedido = envio ? await pedidoDe(lineas, envio) : null;
    if (pedido) {
      const texto = `¡Perfecto! ${envio!.detalle} Te dejo el resumen 👇`;
      return { salientes: planWhatsapp({ texto }, pedido), respuesta: { texto }, derivar: false, conIA: false, guardarPedido: pedido.camino };
    }
  }
  // «Lo veo tranquila y te escribo»: se le da tiempo. Nada de armarle el pedido ni ponerle las zonas.
  // «Gracias» solo: se contesta corto y sin volver a ofrecer.
  if (!c.toque && c.historial.length && soloAgradece(c.texto)) {
    const salientes = planDeNada(c.nombre);
    return { salientes, respuesta: { texto: textoParaPanel(salientes[0]) }, derivar: false, conIA: false };
  }
  if (!c.toque && postergaCompra(c.texto)) {
    const salientes = planSinApuro(c.nombre, urlSitio());
    return { salientes, respuesta: { texto: textoParaPanel(salientes[0]) }, derivar: false, conIA: false };
  }
  // «Ver los productos»: se muestran, sin preguntar ni gastar el modelo. Primero el de entrada, después por precio.
  if (quiereVer(c.texto)) {
    const cfgArg = await leerConfig();
    const combos = (await combosTienda({ activo: true, tipo: "COMBO" }))
      .filter((x) => x.disponible)
      .sort((a, b) => a.precio - b.precio)
      .map((x) => ({ slug: x.slug, nombre: x.nombre, precio: pesos(Math.round(x.precio)), argumento: argumentoCombo(x, cfgArg.descuentoTransferenciaPct, pesos).corto }));
    if (combos.length) return { salientes: planVer(combos, `${urlSitio()}/combos`), respuesta: { texto: "" }, derivar: false, conIA: false };
  }

  // «¿Qué trae?» de un combo: la lista completa, fija, sin gastar el modelo.
  if (c.toque?.tipo === "trae") {
    const combo = (await combosTienda({ slug: c.toque.slug, tipo: "COMBO" }))[0];
    if (combo?.disponible) {
      const salientes = planTrae({
        slug: combo.slug,
        nombre: combo.nombre,
        precio: pesos(Math.round(combo.precio)),
        argumento: argumentoCombo(combo, (await leerConfig()).descuentoTransferenciaPct, pesos).transferencia ?? "",
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
      } Si su mensaje es una pregunta (dirección, envío, pago, un producto), contestala PRIMERO en una frase y recién después ofrecé lo del anuncio. Si no pregunta nada concreto, arrancá por el anuncio: qué trae y por qué conviene, y ofrecé dejárselo listo.</anuncio>\n\n`
    : "";
  const cliente = c.nombre ? `<cliente>Se llama ${c.nombre.slice(0, 40)}${c.historial.length ? " (ya lo saludaste: no lo saludes de nuevo)" : ""}.</cliente>\n` : "";
  const eligio =
    c.toque?.tipo === "quiero"
      ? `<eligio>Tocó «Lo quiero» en el ${c.toque.clase} ${c.toque.clase === "combo" ? "slug" : "codigo"} ${c.toque.id}. Agregalo YA con agregar_al_pedido (junto con lo que ya había elegido antes) y en una frase ofrecé sumar algo chico o dejarlo listo para pagar.</eligio>\n`
      : "";
  // Venta ya cerrada: lo que mande ahora (dirección, horario) va al pedido.
  const ordenId = c.pedidoGuardado?.startsWith("orden:") ? Number(c.pedidoGuardado.slice(6)) || undefined : undefined;
  const cerrado = ordenId
    ? `<pedido_cerrado>Ya cerró la compra (pedido ${numeroPedido(ordenId)}). Si te pasa nombre, dirección, referencia u horario, guardalos con datos_de_entrega. No le vuelvas a ofrecer productos salvo que los pida.</pedido_cerrado>\n`
    : "";
  const r = vendedorActivo() ? await responderComoVendedor(`${c.negocio}${cliente}${anuncio}${cerrado}${eligio}${c.texto}`, c.historial, null, "whatsapp", { ordenId }) : null;

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
  // El pedido: el que acaba de armar, o el guardado si recién ahora cotizó el envío.
  const lineas = respuesta.acciones?.length ? lineasDeAcciones(respuesta.acciones) : respuesta.envio && c.pedidoGuardado ? lineasDeCamino(c.pedidoGuardado) : [];
  const pedido = await pedidoDe(lineas, respuesta.envio);
  let salientes = derivar ? [{ tipo: "texto" as const, texto: DERIVADO }] : planWhatsapp(respuesta, pedido);
  // Sin repetir: si el resumen del pedido o la pregunta de la zona ya salieron en los últimos
  // mensajes, no se mandan de nuevo. A Juan le llegó tres veces lo mismo y eso molesta.
  const recientes = c.historial.slice(-6).filter((h) => h.de === "acopio").map((h) => normalizar(h.texto));
  const repetido = (s: Saliente) => {
    const t = normalizar(textoParaPanel(s));
    return recientes.some((h) => h === t || (t.length > 60 && (h.includes(t) || t.includes(h))));
  };
  if (salientes.length > 1) {
    const sinRepetir = salientes.filter((s) => !repetido(s));
    if (sinRepetir.length) salientes = sinRepetir;
  }
  return { salientes, respuesta, derivar, conIA: Boolean(r), guardarPedido: pedido?.camino, aPersona: Boolean(r?.entregaGuardada) };
}
